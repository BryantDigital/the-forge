import { ConvexError, v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdminAccess } from "./adminAuth";

const audienceValidator = v.union(
  v.literal("registered"),
  v.literal("waitlisted"),
  v.literal("all_event_families"),
);

const channelValidator = v.union(
  v.literal("email"),
  v.literal("sms"),
  v.literal("both"),
);

export const getProviderStatus = query({
  args: {},
  handler: async (ctx) => {
    try {
      await requireAdminAccess(ctx);
    } catch {
      return { email: false, sms: false };
    }
    return {
      email:
        Boolean(process.env.SENDGRID_API_KEY) &&
        Boolean(process.env.SENDGRID_FROM_EMAIL),
      sms:
        process.env.SMS_ENABLED === "true" &&
        Boolean(process.env.TWILIO_ACCOUNT_SID) &&
        Boolean(process.env.TWILIO_AUTH_TOKEN) &&
        Boolean(process.env.TWILIO_MESSAGING_SERVICE_SID),
    };
  },
});

export const listEventHistory = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    try {
      await requireAdminAccess(ctx);
    } catch {
      return [];
    }
    const communications = await ctx.db
      .query("communications")
      .withIndex("by_event", (range) => range.eq("eventId", args.eventId))
      .order("desc")
      .take(30);

    return Promise.all(
      communications.map(async (communication) => {
        const deliveries = await ctx.db
          .query("communicationDeliveries")
          .withIndex("by_communication", (range) =>
            range.eq("communicationId", communication._id),
          )
          .collect();
        return {
          id: communication._id,
          channel: communication.channel,
          kind: communication.kind,
          audience: communication.audience,
          subject: communication.subject,
          body: communication.body,
          status: communication.status,
          isTest: Boolean(communication.isTest),
          scheduledFor: communication.scheduledFor,
          sentAt: communication.sentAt,
          recipientCount: communication.recipientCount ?? deliveries.length,
          delivered: deliveries.filter((delivery) => delivery.status === "delivered").length,
          failed: deliveries.filter((delivery) =>
            delivery.status === "failed" || delivery.status === "undelivered"
          ).length,
        };
      }),
    );
  },
});

export const queueBroadcast = mutation({
  args: {
    eventId: v.id("events"),
    channel: channelValidator,
    audience: audienceValidator,
    subject: v.optional(v.string()),
    body: v.string(),
    isTest: v.boolean(),
    testEmail: v.optional(v.string()),
    testPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdminAccess(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found.");

    const body = args.body.trim();
    const subject = args.subject?.trim();
    if (!body || body.length > 1_200) {
      throw new ConvexError("Enter a message of 1,200 characters or fewer.");
    }
    if (
      (args.channel === "email" || args.channel === "both") &&
      (!subject || subject.length > 160)
    ) {
      throw new ConvexError("Enter an email subject of 160 characters or fewer.");
    }

    const channels =
      args.channel === "both"
        ? (["email", "sms"] as const)
        : ([args.channel] as const);
    const now = Date.now();
    const ids: Id<"communications">[] = [];

    for (const channel of channels) {
      const testRecipient =
        channel === "email"
          ? (args.testEmail?.trim() || actor.email)
          : normalizeUsPhone(args.testPhone ?? "");
      if (args.isTest && !testRecipient) {
        throw new ConvexError(
          channel === "sms"
            ? "Enter a valid mobile number for the test text."
            : "Enter a valid test email.",
        );
      }

      const recipients = args.isTest
        ? 1
        : (
            await collectAudience(ctx, event._id, args.audience, channel)
          ).length;
      const communicationId = await ctx.db.insert("communications", {
        eventId: event._id,
        channel,
        provider: channel === "email" ? "sendgrid" : "twilio",
        kind: "admin_broadcast",
        audience: args.audience,
        subject: channel === "email" ? subject : undefined,
        body,
        recipientCount: recipients,
        createdByAuthUserId: actor.authUserId,
        status: "queued",
        isTest: args.isTest,
        testRecipient: args.isTest ? testRecipient ?? undefined : undefined,
        scheduledFor: now,
        createdAt: now,
      });
      await ctx.scheduler.runAfter(0, internal.communications.deliverCommunication, {
        communicationId,
      });
      ids.push(communicationId);
    }

    await ctx.db.insert("auditLogs", {
      actorAuthUserId: actor.authUserId,
      actorEmail: actor.email,
      action: args.isTest ? "communication.test_queued" : "communication.broadcast_queued",
      entityType: "event",
      entityId: event._id,
      summary: `${args.isTest ? "Queued test" : "Queued"} ${args.channel} message for ${event.title}`,
      createdAt: now,
    });
    return { communicationIds: ids };
  },
});

export const getDeliveryPayload = internalQuery({
  args: { communicationId: v.id("communications") },
  handler: async (ctx, args) => {
    const communication = await ctx.db.get(args.communicationId);
    if (!communication || !communication.eventId) return null;
    const event = await ctx.db.get(communication.eventId);
    if (!event) return null;
    if (communication.isTest && communication.testRecipient) {
      return {
        communication,
        event,
        recipients: [{
          recipient: communication.testRecipient,
          householdId: undefined,
          registrationId: undefined,
          parentFirstName: "Forge Team",
        }],
      };
    }
    if (communication.registrationId && communication.householdId) {
      const [registration, household] = await Promise.all([
        ctx.db.get(communication.registrationId),
        ctx.db.get(communication.householdId),
      ]);
      if (!registration || !household) return null;
      if (communication.channel === "sms") {
        const suppression = await ctx.db
          .query("smsSuppressions")
          .withIndex("by_mobile_phone", (range) =>
            range.eq("mobilePhone", household.mobilePhone),
          )
          .unique();
        return {
          communication,
          event,
          recipients:
            registration.smsNotificationsEnabled &&
            household.smsOptInAt &&
            !suppression
              ? [{
                  recipient: household.mobilePhone,
                  householdId: household._id,
                  registrationId: registration._id,
                  parentFirstName: household.parentFirstName,
                }]
              : [],
        };
      }
    }
    const recipients = await collectAudience(
      ctx,
      event._id,
      communication.audience ?? "registered",
      communication.channel,
    );
    return { communication, event, recipients };
  },
});

export const queueRegistrationSms = internalMutation({
  args: {
    registrationId: v.id("registrations"),
    kind: v.union(
      v.literal("confirmation"),
      v.literal("waitlist_offer"),
      v.literal("cancellation"),
    ),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    if (process.env.SMS_ENABLED !== "true") return null;
    const registration = await ctx.db.get(args.registrationId);
    if (!registration) return null;
    const household = await ctx.db.get(registration.householdId);
    if (
      !household ||
      !registration.smsNotificationsEnabled ||
      !household.smsOptInAt
    ) {
      return null;
    }
    const suppression = await ctx.db
      .query("smsSuppressions")
      .withIndex("by_mobile_phone", (range) =>
        range.eq("mobilePhone", household.mobilePhone),
      )
      .unique();
    if (suppression) return null;
    const now = Date.now();
    const communicationId = await ctx.db.insert("communications", {
      eventId: registration.eventId,
      householdId: household._id,
      registrationId: registration._id,
      channel: "sms",
      provider: "twilio",
      kind: args.kind,
      body: args.body.trim().slice(0, 1_200),
      recipientCount: 1,
      status: "queued",
      scheduledFor: now,
      createdAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.communications.deliverCommunication, {
      communicationId,
    });
    return communicationId;
  },
});

export const startDelivery = internalMutation({
  args: { communicationId: v.id("communications") },
  handler: async (ctx, args) => {
    const communication = await ctx.db.get(args.communicationId);
    if (!communication || communication.status !== "queued") return false;
    await ctx.db.patch(communication._id, { status: "sending" });
    return true;
  },
});

export const recordDelivery = internalMutation({
  args: {
    communicationId: v.id("communications"),
    eventId: v.optional(v.id("events")),
    householdId: v.optional(v.id("households")),
    registrationId: v.optional(v.id("registrations")),
    channel: v.union(v.literal("email"), v.literal("sms")),
    recipient: v.string(),
    providerMessageId: v.optional(v.string()),
    status: v.union(v.literal("sent"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("communicationDeliveries", {
      ...args,
      sentAt: args.status === "sent" ? now : undefined,
      updatedAt: now,
      createdAt: now,
    });
  },
});

export const finishDelivery = internalMutation({
  args: {
    communicationId: v.id("communications"),
    sent: v.number(),
    failed: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const communication = await ctx.db.get(args.communicationId);
    if (!communication) return;
    const status =
      args.failed === 0
        ? "sent"
        : args.sent > 0
          ? "partially_failed"
          : "failed";
    await ctx.db.patch(communication._id, {
      status,
      recipientCount: args.sent + args.failed,
      sentAt: args.sent > 0 ? Date.now() : undefined,
      error: args.error,
    });
  },
});

export const deliverCommunication = internalAction({
  args: { communicationId: v.id("communications") },
  handler: async (ctx, args) => {
    const started = await ctx.runMutation(internal.communications.startDelivery, args);
    if (!started) return { delivered: false };
    const payload = await ctx.runQuery(internal.communications.getDeliveryPayload, args);
    if (!payload) {
      await ctx.runMutation(internal.communications.finishDelivery, {
        ...args,
        sent: 0,
        failed: 1,
        error: "Communication payload unavailable.",
      });
      return { delivered: false };
    }

    let sent = 0;
    let failed = 0;
    let lastError: string | undefined;
    for (const recipient of payload.recipients) {
      try {
        const result =
          payload.communication.channel === "email"
            ? await sendSendGridEmail({
                to: recipient.recipient,
                subject: `${payload.communication.isTest ? "[TEST] " : ""}${payload.communication.subject ?? payload.event.title}`,
                html: broadcastEmail({
                  event: payload.event,
                  body: payload.communication.body,
                  parentFirstName: recipient.parentFirstName,
                  isTest: Boolean(payload.communication.isTest),
                }),
                text: payload.communication.body,
              })
            : await sendTwilioSms({
                to: recipient.recipient,
                body: `${payload.communication.isTest ? "[TEST] " : ""}${payload.communication.body}`,
              });
        await ctx.runMutation(internal.communications.recordDelivery, {
          communicationId: payload.communication._id,
          eventId: payload.event._id,
          householdId: recipient.householdId,
          registrationId: recipient.registrationId,
          channel: payload.communication.channel,
          recipient: recipient.recipient,
          providerMessageId: result.messageId,
          status: "sent",
        });
        sent += 1;
      } catch (error) {
        lastError = safeError(error);
        await ctx.runMutation(internal.communications.recordDelivery, {
          communicationId: payload.communication._id,
          eventId: payload.event._id,
          householdId: recipient.householdId,
          registrationId: recipient.registrationId,
          channel: payload.communication.channel,
          recipient: recipient.recipient,
          status: "failed",
          error: lastError,
        });
        failed += 1;
      }
    }
    await ctx.runMutation(internal.communications.finishDelivery, {
      communicationId: payload.communication._id,
      sent,
      failed,
      error: lastError,
    });
    return { delivered: true, sent, failed };
  },
});

export const findDueReminders = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const events = await ctx.db
      .query("events")
      .withIndex("by_status_and_start", (range) => range.eq("status", "published"))
      .collect();
    const due: Array<{
      eventId: Id<"events">;
      kind: "week_reminder" | "day_of_reminder";
    }> = [];

    for (const event of events) {
      if (event.startsAt <= now) continue;
      const kinds: Array<"week_reminder" | "day_of_reminder"> = [];
      if (now >= event.startsAt - 7 * 60 * 60 * 1000) {
        kinds.push("day_of_reminder");
      } else if (now >= event.startsAt - 7 * 24 * 60 * 60 * 1000) {
        kinds.push("week_reminder");
      }
      const existing = await ctx.db
        .query("communications")
        .withIndex("by_event", (range) => range.eq("eventId", event._id))
        .collect();
      for (const kind of kinds) {
        if (!existing.some((communication) => communication.kind === kind)) {
          due.push({ eventId: event._id, kind });
        }
      }
    }
    return due;
  },
});

export const queueAutomatedReminder = internalMutation({
  args: {
    eventId: v.id("events"),
    kind: v.union(v.literal("week_reminder"), v.literal("day_of_reminder")),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event || event.status !== "published" || event.startsAt <= Date.now()) {
      return [];
    }
    const existing = await ctx.db
      .query("communications")
      .withIndex("by_event", (range) => range.eq("eventId", event._id))
      .collect();
    if (existing.some((communication) => communication.kind === args.kind)) return [];

    const dayOf = args.kind === "day_of_reminder";
    const subject = dayOf
      ? `Today: ${event.title}`
      : `One week to go: ${event.title}`;
    const body = dayOf
      ? `The Forge is today at ${formatTime(event.startsAt)}. Bring a water bottle, Bible, and Forge shirt. We’ll see you at ${event.locationName}.`
      : `${event.title} is one week away. It starts at ${formatTime(event.startsAt)} at ${event.locationName}. Bring a water bottle, Bible, and Forge shirt.`;
    const now = Date.now();
    const ids: Id<"communications">[] = [];
    for (const channel of ["email", "sms"] as const) {
      const communicationId = await ctx.db.insert("communications", {
        eventId: event._id,
        channel,
        provider: channel === "email" ? "sendgrid" : "twilio",
        kind: args.kind,
        audience: "registered",
        subject: channel === "email" ? subject : undefined,
        body,
        status: "queued",
        scheduledFor: now,
        createdAt: now,
      });
      await ctx.scheduler.runAfter(0, internal.communications.deliverCommunication, {
        communicationId,
      });
      ids.push(communicationId);
    }
    return ids;
  },
});

export const processDueReminders = internalAction({
  args: {},
  handler: async (ctx): Promise<{ queued: number }> => {
    const due: Array<{
      eventId: Id<"events">;
      kind: "week_reminder" | "day_of_reminder";
    }> = await ctx.runQuery(internal.communications.findDueReminders, {});
    for (const reminder of due) {
      await ctx.runMutation(internal.communications.queueAutomatedReminder, reminder);
    }
    return { queued: due.length };
  },
});

export const updateTwilioDeliveryStatus = internalMutation({
  args: {
    messageId: v.string(),
    status: v.string(),
    error: v.optional(v.string()),
    recipient: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db
      .query("communicationDeliveries")
      .withIndex("by_provider_message", (range) =>
        range.eq("providerMessageId", args.messageId),
      )
      .unique();
    if (!delivery) return { updated: false };
    const delivered = args.status === "delivered";
    const failed = ["failed", "undelivered"].includes(args.status);
    await ctx.db.patch(delivery._id, {
      status: delivered ? "delivered" : failed ? "undelivered" : "sent",
      deliveredAt: delivered ? Date.now() : undefined,
      error: args.error,
      updatedAt: Date.now(),
    });
    if (failed && args.recipient && isPermanentSmsFailure(args.error)) {
      await upsertSuppression(ctx, normalizeUsPhone(args.recipient) ?? args.recipient, "carrier", "twilio_status");
    }
    return { updated: true };
  },
});

export const recordInboundSms = internalMutation({
  args: {
    mobilePhone: v.string(),
    body: v.string(),
    optOutType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mobilePhone = normalizeUsPhone(args.mobilePhone);
    if (!mobilePhone) return { handled: false };
    const command = (args.optOutType ?? args.body).trim().toUpperCase();
    if (["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(command)) {
      await upsertSuppression(ctx, mobilePhone, "stop", "twilio_inbound");
      await disableSmsForPhone(ctx, mobilePhone);
      return { handled: true, action: "stopped" as const };
    }
    if (["START", "UNSTOP", "YES"].includes(command)) {
      const suppression = await ctx.db
        .query("smsSuppressions")
        .withIndex("by_mobile_phone", (range) => range.eq("mobilePhone", mobilePhone))
        .unique();
      if (suppression) await ctx.db.delete(suppression._id);
      await enableSmsForPhone(ctx, mobilePhone);
      return { handled: true, action: "started" as const };
    }
    return { handled: true, action: "none" as const };
  },
});

async function collectAudience(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
  audience: "registered" | "waitlisted" | "all_event_families",
  channel: "email" | "sms",
) {
  const registrations = await ctx.db
    .query("registrations")
    .withIndex("by_event", (range) => range.eq("eventId", eventId))
    .collect();
  const allowedStatuses =
    audience === "registered"
      ? new Set(["confirmed"])
      : audience === "waitlisted"
        ? new Set(["waitlisted", "offered"])
        : new Set(["confirmed", "waitlisted", "offered"]);
  const seen = new Set<string>();
  const recipients: Array<{
    recipient: string;
    householdId: Id<"households">;
    registrationId: Id<"registrations">;
    parentFirstName: string;
  }> = [];

  for (const registration of registrations) {
    if (!allowedStatuses.has(registration.status)) continue;
    const household = await ctx.db.get(registration.householdId);
    if (!household) continue;
    const recipient =
      channel === "email" ? household.email : household.mobilePhone;
    if (
      !recipient ||
      seen.has(recipient) ||
      (channel === "email" && !registration.emailNotificationsEnabled) ||
      (channel === "sms" &&
        (!registration.smsNotificationsEnabled || !household.smsOptInAt))
    ) {
      continue;
    }
    if (channel === "sms") {
      const suppression = await ctx.db
        .query("smsSuppressions")
        .withIndex("by_mobile_phone", (range) =>
          range.eq("mobilePhone", recipient),
        )
        .unique();
      if (suppression) continue;
    }
    seen.add(recipient);
    recipients.push({
      recipient,
      householdId: household._id,
      registrationId: registration._id,
      parentFirstName: household.parentFirstName,
    });
  }
  return recipients;
}

async function sendSendGridEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requiredEnv("SENDGRID_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: {
        email: requiredEnv("SENDGRID_FROM_EMAIL"),
        name: process.env.SENDGRID_FROM_NAME ?? "The Forge",
      },
      ...(process.env.SENDGRID_REPLY_TO_EMAIL
        ? { reply_to: { email: process.env.SENDGRID_REPLY_TO_EMAIL } }
        : {}),
      subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`SendGrid rejected the message (${response.status}).`);
  }
  return { messageId: response.headers.get("x-message-id") ?? undefined };
}

async function sendTwilioSms({ to, body }: { to: string; body: string }) {
  if (process.env.SMS_ENABLED !== "true") {
    throw new Error("Twilio SMS is not enabled.");
  }
  const accountSid = requiredEnv("TWILIO_ACCOUNT_SID");
  const authToken = requiredEnv("TWILIO_AUTH_TOKEN");
  const convexSiteUrl = requiredEnv("CONVEX_SITE_URL").replace(/\/$/, "");
  const params = new URLSearchParams({
    To: to,
    MessagingServiceSid: requiredEnv("TWILIO_MESSAGING_SERVICE_SID"),
    Body: `${body.trim()}\n\nThe Forge · Reply STOP to opt out.`,
    StatusCallback: `${convexSiteUrl}/twilio/status`,
  });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );
  const result = (await response.json()) as {
    sid?: string;
    message?: string;
  };
  if (!response.ok || !result.sid) {
    throw new Error(result.message ?? `Twilio rejected the message (${response.status}).`);
  }
  return { messageId: result.sid };
}

function broadcastEmail({
  event,
  body,
  parentFirstName,
  isTest,
}: {
  event: Doc<"events">;
  body: string;
  parentFirstName: string;
  isTest: boolean;
}) {
  const siteUrl = (process.env.SITE_URL ?? "https://forgeva.com").replace(/\/$/, "");
  const eventUrl = `${siteUrl}/events/${event.slug}`;
  return `<!doctype html><html lang="en"><body style="margin:0;background:#0a0a0b">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0b;border-collapse:collapse">
      <tr><td height="6" style="background:#b81921"></td></tr>
      <tr><td style="padding:34px 16px 42px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:0 auto;border-collapse:collapse">
          <tr><td style="padding:0 4px 26px"><img src="${siteUrl}/images/forge-logo-white.png" width="220" alt="The Forge" style="display:block;width:220px;max-width:70%;height:auto"></td></tr>
          <tr><td style="padding:38px;background:#f8f4ed;color:#171616;font-family:Arial,Helvetica,sans-serif">
            <p style="margin:0 0 12px;color:#b81921;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase">${isTest ? "Test message" : "Event update"}</p>
            <h1 style="margin:0 0 22px;font-family:Impact,'Arial Narrow',Arial,sans-serif;font-size:36px;line-height:1.05;text-transform:uppercase">${escapeHtml(event.title)}</h1>
            <p style="margin:0 0 18px">Hi ${escapeHtml(parentFirstName)},</p>
            <div style="color:#4d4944;font-size:16px;line-height:1.7">${escapeHtml(body).replace(/\n/g, "<br>")}</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;border:1px solid #ddd3c5;background:#f4eee5">
              <tr><td style="padding:14px;color:#766e64;font-size:11px;font-weight:800;text-transform:uppercase">When</td><td style="padding:14px;text-align:right;font-weight:700">${escapeHtml(formatDateTime(event.startsAt))}</td></tr>
              <tr><td style="padding:14px;border-top:1px solid #ddd3c5;color:#766e64;font-size:11px;font-weight:800;text-transform:uppercase">Where</td><td style="padding:14px;border-top:1px solid #ddd3c5;text-align:right;font-weight:700">${escapeHtml(event.locationName)}</td></tr>
            </table>
            <a href="${eventUrl}" style="display:inline-block;background:#b81921;color:#fff;padding:15px 22px;text-decoration:none;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">View event details&nbsp; →</a>
          </td></tr>
          <tr><td style="padding:24px 4px 0;color:#908d87;font-family:Arial,sans-serif;font-size:12px;line-height:1.6"><strong style="color:#fff;text-transform:uppercase">Faith · Fitness · Fellowship · Fun</strong><br>The Forge Christian Ministries · Virginia Beach, Virginia</td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

async function disableSmsForPhone(ctx: MutationCtx, mobilePhone: string) {
  const households = await ctx.db
    .query("households")
    .filter((query) => query.eq(query.field("mobilePhone"), mobilePhone))
    .collect();
  for (const household of households) {
    await ctx.db.patch(household._id, {
      smsOptInAt: undefined,
      updatedAt: Date.now(),
    });
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_household", (range) => range.eq("householdId", household._id))
      .collect();
    for (const registration of registrations) {
      await ctx.db.patch(registration._id, {
        smsNotificationsEnabled: false,
        updatedAt: Date.now(),
      });
    }
  }
}

async function enableSmsForPhone(ctx: MutationCtx, mobilePhone: string) {
  const households = await ctx.db
    .query("households")
    .filter((query) => query.eq(query.field("mobilePhone"), mobilePhone))
    .collect();
  for (const household of households) {
    await ctx.db.patch(household._id, {
      smsOptInAt: Date.now(),
      smsConsentVersion: "twilio-start-v1",
      updatedAt: Date.now(),
    });
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_household", (range) => range.eq("householdId", household._id))
      .collect();
    for (const registration of registrations) {
      if (registration.status !== "cancelled") {
        await ctx.db.patch(registration._id, {
          smsNotificationsEnabled: true,
          smsConsentVersion: "twilio-start-v1",
          smsConsentAcceptedAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
  }
}

async function upsertSuppression(
  ctx: MutationCtx,
  mobilePhone: string,
  reason: "stop" | "carrier" | "admin",
  source: "twilio_inbound" | "twilio_status" | "admin",
) {
  const existing = await ctx.db
    .query("smsSuppressions")
    .withIndex("by_mobile_phone", (range) => range.eq("mobilePhone", mobilePhone))
    .unique();
  const now = Date.now();
  if (existing) {
    await ctx.db.patch(existing._id, { reason, source, suppressedAt: now, updatedAt: now });
  } else {
    await ctx.db.insert("smsSuppressions", {
      mobilePhone,
      reason,
      source,
      suppressedAt: now,
      updatedAt: now,
    });
  }
}

function isPermanentSmsFailure(error?: string) {
  return Boolean(error && ["21610", "21614", "30003", "30005", "30006", "30007"].some((code) => error.includes(code)));
}

function normalizeUsPhone(value: string) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return national.length === 10 ? `+1${national}` : null;
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(timestamp);
}

function safeError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 500) : "Provider delivery failed.";
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}
