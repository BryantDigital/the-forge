import { ConvexError, v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";

const childInput = v.object({
  firstName: v.string(),
  lastName: v.string(),
  birthDate: v.string(),
  statedAge: v.number(),
  allergies: v.optional(v.string()),
  notes: v.optional(v.string()),
});

export const register = mutation({
  args: {
    eventSlug: v.string(),
    parentFirstName: v.string(),
    parentLastName: v.string(),
    email: v.string(),
    normalizedEmail: v.string(),
    mobilePhone: v.string(),
    emergencyContactName: v.string(),
    emergencyContactPhone: v.string(),
    children: v.array(childInput),
    managementTokenHash: v.string(),
    waiverVersion: v.string(),
    waiverAcceptedAt: v.number(),
    emailNotificationsEnabled: v.boolean(),
    smsNotificationsEnabled: v.boolean(),
    smsConsentVersion: v.optional(v.string()),
    smsConsentAcceptedAt: v.optional(v.number()),
    generalEmailOptInAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (range) => range.eq("slug", args.eventSlug))
      .unique();

    if (!event || event.status !== "published") {
      throw new ConvexError("This event is not available for registration.");
    }
    if (now < event.enrollmentOpensAt) {
      throw new ConvexError("Registration has not opened yet.");
    }
    if (now >= event.registrationClosesAt) {
      throw new ConvexError("Registration for this event is closed.");
    }
    if (args.children.length < 1 || args.children.length > 10) {
      throw new ConvexError("Register between one and 10 children.");
    }
    if (args.children.length > event.capacity) {
      throw new ConvexError("This family request is larger than the event capacity.");
    }

    let household = await ctx.db
      .query("households")
      .withIndex("by_normalized_email", (range) =>
        range.eq("normalizedEmail", args.normalizedEmail),
      )
      .unique();

    const householdFields = {
      email: args.email,
      parentFirstName: args.parentFirstName,
      parentLastName: args.parentLastName,
      mobilePhone: args.mobilePhone,
      emergencyContactName: args.emergencyContactName,
      emergencyContactPhone: args.emergencyContactPhone,
      updatedAt: now,
    };

    let householdId: Id<"households">;
    if (household) {
      householdId = household._id;
      await ctx.db.patch(householdId, {
        ...householdFields,
        generalEmailOptInAt: args.generalEmailOptInAt ?? household.generalEmailOptInAt,
        smsOptInAt: args.smsConsentAcceptedAt ?? household.smsOptInAt,
        smsConsentVersion: args.smsConsentVersion ?? household.smsConsentVersion,
      });
      household = await ctx.db.get(householdId);
    } else {
      householdId = await ctx.db.insert("households", {
        normalizedEmail: args.normalizedEmail,
        ...householdFields,
        generalEmailOptInAt: args.generalEmailOptInAt,
        smsOptInAt: args.smsConsentAcceptedAt,
        smsConsentVersion: args.smsConsentVersion,
        createdAt: now,
      });
      household = await ctx.db.get(householdId);
    }

    const existingRegistration = await ctx.db
      .query("registrations")
      .withIndex("by_event_and_household", (range) =>
        range.eq("eventId", event._id).eq("householdId", householdId),
      )
      .filter((row) => row.neq(row.field("status"), "cancelled"))
      .first();
    if (existingRegistration) {
      throw new ConvexError(
        "This email already has an active registration for this event. Use the management link in your confirmation email.",
      );
    }

    const capacity = await capacitySnapshot(ctx, event._id);
    const waitlisted = await ctx.db
      .query("registrations")
      .withIndex("by_event_and_status", (range) =>
        range.eq("eventId", event._id).eq("status", "waitlisted"),
      )
      .collect();
    const earlierFamilyFits = waitlisted
      .sort((a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0))
      .some((registration) => registration.seatCount <= capacity.remaining);
    const status =
      args.children.length <= capacity.remaining && !earlierFamilyFits
        ? ("confirmed" as const)
        : ("waitlisted" as const);

    const allEventRegistrations = await ctx.db
      .query("registrations")
      .withIndex("by_event", (range) => range.eq("eventId", event._id))
      .collect();
    const waitlistPosition =
      status === "waitlisted"
        ? Math.max(0, ...allEventRegistrations.map((item) => item.waitlistPosition ?? 0)) + 1
        : undefined;

    const registrationId = await ctx.db.insert("registrations", {
      eventId: event._id,
      householdId,
      status,
      seatCount: args.children.length,
      waitlistPosition,
      managementTokenHash: args.managementTokenHash,
      waiverVersion: args.waiverVersion,
      waiverAcceptedAt: args.waiverAcceptedAt,
      emailNotificationsEnabled: args.emailNotificationsEnabled,
      smsNotificationsEnabled: args.smsNotificationsEnabled,
      smsConsentVersion: args.smsConsentVersion,
      smsConsentAcceptedAt: args.smsConsentAcceptedAt,
      createdAt: now,
      updatedAt: now,
    });

    const existingChildren = await ctx.db
      .query("children")
      .withIndex("by_household", (range) => range.eq("householdId", householdId))
      .collect();

    for (const child of args.children) {
      const savedChild = existingChildren.find(
        (candidate) =>
          candidate.firstName.toLowerCase() === child.firstName.toLowerCase() &&
          candidate.lastName.toLowerCase() === child.lastName.toLowerCase() &&
          candidate.birthDate === child.birthDate,
      );
      let childId: Id<"children">;
      if (savedChild) {
        childId = savedChild._id;
        await ctx.db.patch(childId, {
          ...child,
          archivedAt: undefined,
          updatedAt: now,
        });
      } else {
        childId = await ctx.db.insert("children", {
          householdId,
          ...child,
          createdAt: now,
          updatedAt: now,
        });
      }

      await ctx.db.insert("registrationChildren", {
        registrationId,
        eventId: event._id,
        childId,
        ...child,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("auditLogs", {
      action: status === "confirmed" ? "registration.confirmed" : "registration.waitlisted",
      entityType: "registration",
      entityId: registrationId,
      summary: `${args.parentFirstName} ${args.parentLastName} registered ${args.children.length} child${args.children.length === 1 ? "" : "ren"} for ${event.title}`,
      createdAt: now,
    });

    if (status === "waitlisted" && capacity.remaining > 0) {
      await ctx.scheduler.runAfter(0, internal.registrations.processWaitlist, {
        eventId: event._id,
      });
    }

    return {
      registrationId,
      status,
      seatCount: args.children.length,
      remaining: status === "confirmed"
        ? Math.max(0, capacity.remaining - args.children.length)
        : capacity.remaining,
    };
  },
});

export const getManaged = query({
  args: { managementTokenHash: v.string() },
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query("registrations")
      .withIndex("by_management_token", (range) =>
        range.eq("managementTokenHash", args.managementTokenHash),
      )
      .unique();
    if (!registration) return null;
    const [event, household, children] = await Promise.all([
      ctx.db.get(registration.eventId),
      ctx.db.get(registration.householdId),
      ctx.db
        .query("registrationChildren")
        .withIndex("by_registration", (range) =>
          range.eq("registrationId", registration._id),
        )
        .collect(),
    ]);
    if (!event || !household) return null;
    return {
      registrationId: registration._id,
      status: registration.status,
      active:
        registration.status === "offered" &&
        Boolean(
          registration.offerExpiresAt &&
            registration.offerExpiresAt > Date.now(),
        ),
      seatCount: registration.seatCount,
      waitlistPosition: registration.waitlistPosition,
      offerExpiresAt: registration.offerExpiresAt,
      event: {
        slug: event.slug,
        title: event.title,
        startsAt: event.startsAt,
        locationName: event.locationName,
        addressLine1: event.addressLine1,
        city: event.city,
        state: event.state,
        postalCode: event.postalCode,
      },
      household: {
        parentName: `${household.parentFirstName} ${household.parentLastName}`,
        email: household.email,
        mobilePhone: household.mobilePhone,
      },
      children: children.map((child) => ({
        id: child._id,
        name: `${child.firstName} ${child.lastName}`,
        age: child.statedAge,
        status: child.status,
      })),
    };
  },
});

export const cancelChildren = mutation({
  args: {
    managementTokenHash: v.string(),
    childIds: v.array(v.id("registrationChildren")),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query("registrations")
      .withIndex("by_management_token", (range) =>
        range.eq("managementTokenHash", args.managementTokenHash),
      )
      .unique();
    if (!registration || registration.status === "cancelled") {
      throw new ConvexError("This registration is no longer active.");
    }
    const children = await ctx.db
      .query("registrationChildren")
      .withIndex("by_registration", (range) =>
        range.eq("registrationId", registration._id),
      )
      .collect();
    const requestedIds = new Set(args.childIds);
    const cancellable = children.filter(
      (child) => child.status === "active" && requestedIds.has(child._id),
    );
    if (cancellable.length < 1) {
      throw new ConvexError("Select at least one active child to cancel.");
    }

    const now = Date.now();
    for (const child of cancellable) {
      await ctx.db.patch(child._id, {
        status: "cancelled",
        cancelledAt: now,
        checkedInAt: undefined,
        checkedInByAuthUserId: undefined,
        updatedAt: now,
      });
    }
    const activeCount = children.filter(
      (child) => child.status === "active" && !requestedIds.has(child._id),
    ).length;
    const releasedReservedSeats =
      registration.status === "confirmed" || registration.status === "offered";
    await ctx.db.patch(registration._id, {
      seatCount: activeCount,
      status: activeCount === 0 ? "cancelled" : registration.status,
      cancelledAt: activeCount === 0 ? now : undefined,
      offerTokenHash: activeCount === 0 ? undefined : registration.offerTokenHash,
      offerExpiresAt: activeCount === 0 ? undefined : registration.offerExpiresAt,
      offeredAt: activeCount === 0 ? undefined : registration.offeredAt,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      action: "registration.children_cancelled",
      entityType: "registration",
      entityId: registration._id,
      summary: `Cancelled ${cancellable.length} child${cancellable.length === 1 ? "" : "ren"} from a registration`,
      createdAt: now,
    });

    if (releasedReservedSeats || registration.status === "waitlisted") {
      await ctx.scheduler.runAfter(0, internal.registrations.processWaitlist, {
        eventId: registration.eventId,
      });
    }
    return {
      registrationId: registration._id,
      cancelledChildren: cancellable.length,
      remainingChildren: activeCount,
      status: activeCount === 0 ? ("cancelled" as const) : registration.status,
    };
  },
});

export const getOffer = query({
  args: { offerTokenHash: v.string() },
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query("registrations")
      .withIndex("by_offer_token", (range) =>
        range.eq("offerTokenHash", args.offerTokenHash),
      )
      .unique();
    if (!registration) return null;
    const event = await ctx.db.get(registration.eventId);
    if (!event) return null;
    return {
      registrationId: registration._id,
      status: registration.status,
      active:
        registration.status === "offered" &&
        Boolean(
          registration.offerExpiresAt &&
            registration.offerExpiresAt > Date.now(),
        ),
      seatCount: registration.seatCount,
      offerExpiresAt: registration.offerExpiresAt,
      eventTitle: event.title,
      eventSlug: event.slug,
    };
  },
});

export const claimOffer = mutation({
  args: { offerTokenHash: v.string() },
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query("registrations")
      .withIndex("by_offer_token", (range) =>
        range.eq("offerTokenHash", args.offerTokenHash),
      )
      .unique();
    if (
      !registration ||
      registration.status !== "offered" ||
      !registration.offerExpiresAt ||
      registration.offerExpiresAt <= Date.now()
    ) {
      throw new ConvexError("This waitlist offer is invalid or has expired.");
    }
    await ctx.db.patch(registration._id, {
      status: "confirmed",
      offerTokenHash: undefined,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("auditLogs", {
      action: "waitlist.offer_claimed",
      entityType: "registration",
      entityId: registration._id,
      summary: `Claimed a ${registration.seatCount}-seat waitlist offer`,
      createdAt: Date.now(),
    });
    return { registrationId: registration._id, status: "confirmed" as const };
  },
});

export const getEmailContext = internalQuery({
  args: { registrationId: v.id("registrations") },
  handler: async (ctx, args) => {
    const registration = await ctx.db.get(args.registrationId);
    if (!registration) return null;
    const [event, household] = await Promise.all([
      ctx.db.get(registration.eventId),
      ctx.db.get(registration.householdId),
    ]);
    if (!event || !household) return null;
    return { registration, event, household };
  },
});

export const sendConfirmation = action({
  args: {
    registrationId: v.id("registrations"),
    managementToken: v.string(),
  },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.registrations.getEmailContext, {
      registrationId: args.registrationId,
    });
    if (!context || (await sha256(args.managementToken)) !== context.registration.managementTokenHash) {
      throw new ConvexError("Invalid registration management token.");
    }
    const siteUrl = requiredEnv("SITE_URL").replace(/\/$/, "");
    const manageUrl = `${siteUrl}/rsvp/${encodeURIComponent(args.managementToken)}`;
    const confirmed = context.registration.status === "confirmed";
    await sendEmail({
      to: context.household.email,
      subject: confirmed
        ? `You’re registered for ${context.event.title}`
        : `You’re on the waitlist for ${context.event.title}`,
      text: confirmed
        ? `Your ${context.registration.seatCount}-seat registration is confirmed. Manage or cancel your registration: ${manageUrl}`
        : `Your family is on the waitlist for ${context.registration.seatCount} seats. We will email you if enough seats open for your entire request. Manage your registration: ${manageUrl}`,
      html: emailFrame(
        confirmed ? "Registration confirmed" : "Waitlist confirmed",
        `<p>Your family has <strong>${context.registration.seatCount} ${confirmed ? "confirmed" : "waitlisted"} seat${context.registration.seatCount === 1 ? "" : "s"}</strong> for ${escapeHtml(context.event.title)}.</p>
         <p>${confirmed ? "We’ll send reminders before the event." : "If enough seats open for your entire family request, you’ll receive a 24-hour offer by email."}</p>
         <p><a href="${manageUrl}" style="${buttonStyle}">Manage registration</a></p>`,
      ),
    });
    return { sent: true };
  },
});

export const sendCancellationNotifications = action({
  args: {
    registrationId: v.id("registrations"),
    managementToken: v.string(),
    cancelledChildren: v.number(),
  },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.registrations.getEmailContext, {
      registrationId: args.registrationId,
    });
    if (!context || (await sha256(args.managementToken)) !== context.registration.managementTokenHash) {
      throw new ConvexError("Invalid registration management token.");
    }
    const detail = `${args.cancelledChildren} child${args.cancelledChildren === 1 ? "" : "ren"} cancelled from ${context.event.title}`;
    await sendEmail({
      to: context.household.email,
      subject: `Registration updated for ${context.event.title}`,
      text: `${detail}. Your open seats have been returned to the event.`,
      html: emailFrame("Registration updated", `<p>${escapeHtml(detail)}.</p><p>Any released seats have been returned to the event.</p>`),
    });
    const owners = (process.env.FORGE_OWNER_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
    for (const email of owners) {
      await sendEmail({
        to: email,
        subject: `Cancellation: ${context.event.title}`,
        text: `${context.household.parentFirstName} ${context.household.parentLastName}: ${detail}.`,
        html: emailFrame("Event cancellation", `<p>${escapeHtml(context.household.parentFirstName)} ${escapeHtml(context.household.parentLastName)}: ${escapeHtml(detail)}.</p>`),
      });
    }
    return { sent: true };
  },
});

export const nextWaitlistCandidate = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const capacity = await capacitySnapshot(ctx, args.eventId);
    if (capacity.remaining < 1) return null;
    const waitlisted = await ctx.db
      .query("registrations")
      .withIndex("by_event_and_status", (range) =>
        range.eq("eventId", args.eventId).eq("status", "waitlisted"),
      )
      .collect();
    return (
      waitlisted
        .sort((a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0))
        .find((registration) => registration.seatCount <= capacity.remaining) ?? null
    );
  },
});

export const offerCandidate = internalMutation({
  args: {
    eventId: v.id("events"),
    registrationId: v.id("registrations"),
    offerTokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const capacity = await capacitySnapshot(ctx, args.eventId);
    const waitlisted = await ctx.db
      .query("registrations")
      .withIndex("by_event_and_status", (range) =>
        range.eq("eventId", args.eventId).eq("status", "waitlisted"),
      )
      .collect();
    const firstFit = waitlisted
      .sort((a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0))
      .find((registration) => registration.seatCount <= capacity.remaining);
    if (!firstFit || firstFit._id !== args.registrationId) return null;

    const offeredAt = Date.now();
    const offerExpiresAt = offeredAt + 24 * 60 * 60 * 1000;
    await ctx.db.patch(firstFit._id, {
      status: "offered",
      offeredAt,
      offerExpiresAt,
      offerTokenHash: args.offerTokenHash,
      updatedAt: offeredAt,
    });
    await ctx.scheduler.runAt(offerExpiresAt, internal.registrations.expireOffer, {
      registrationId: firstFit._id,
      expectedExpiration: offerExpiresAt,
    });
    const [event, household] = await Promise.all([
      ctx.db.get(args.eventId),
      ctx.db.get(firstFit.householdId),
    ]);
    if (!event || !household) return null;
    return {
      email: household.email,
      parentFirstName: household.parentFirstName,
      eventTitle: event.title,
      seatCount: firstFit.seatCount,
      offerExpiresAt,
    };
  },
});

export const processWaitlist = internalAction({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const candidate = await ctx.runQuery(internal.registrations.nextWaitlistCandidate, args);
    if (!candidate) return { offered: false };
    const offerToken = randomToken();
    const result = await ctx.runMutation(internal.registrations.offerCandidate, {
      eventId: args.eventId,
      registrationId: candidate._id,
      offerTokenHash: await sha256(offerToken),
    });
    if (!result) return { offered: false };

    const siteUrl = requiredEnv("SITE_URL").replace(/\/$/, "");
    const claimUrl = `${siteUrl}/waitlist/claim/${encodeURIComponent(offerToken)}`;
    await sendEmail({
      to: result.email,
      subject: `${result.seatCount} Forge seat${result.seatCount === 1 ? "" : "s"} available — claim within 24 hours`,
      text: `Enough seats opened for your entire family request for ${result.eventTitle}. Claim them within 24 hours: ${claimUrl}`,
      html: emailFrame(
        "Your family’s seats are ready",
        `<p>Enough seats opened for your entire <strong>${result.seatCount}-seat</strong> request for ${escapeHtml(result.eventTitle)}.</p>
         <p>This offer expires in 24 hours.</p>
         <p><a href="${claimUrl}" style="${buttonStyle}">Claim seats</a></p>`,
      ),
    });
    return { offered: true };
  },
});

export const expireOffer = internalMutation({
  args: {
    registrationId: v.id("registrations"),
    expectedExpiration: v.number(),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db.get(args.registrationId);
    if (
      !registration ||
      registration.status !== "offered" ||
      registration.offerExpiresAt !== args.expectedExpiration ||
      registration.offerExpiresAt > Date.now()
    ) {
      return { expired: false };
    }
    await ctx.db.patch(registration._id, {
      status: "waitlisted",
      offeredAt: undefined,
      offerExpiresAt: undefined,
      offerTokenHash: undefined,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.registrations.processWaitlist, {
      eventId: registration.eventId,
    });
    return { expired: true };
  },
});

async function capacitySnapshot(ctx: QueryCtx | MutationCtx, eventId: Id<"events">) {
  const [event, confirmed, offered] = await Promise.all([
    ctx.db.get(eventId),
    ctx.db
      .query("registrations")
      .withIndex("by_event_and_status", (range) =>
        range.eq("eventId", eventId).eq("status", "confirmed"),
      )
      .collect(),
    ctx.db
      .query("registrations")
      .withIndex("by_event_and_status", (range) =>
        range.eq("eventId", eventId).eq("status", "offered"),
      )
      .collect(),
  ]);
  if (!event) throw new ConvexError("Event not found.");
  const occupied = [...confirmed, ...offered].reduce(
    (total, registration) => total + registration.seatCount,
    0,
  );
  return { capacity: event.capacity, occupied, remaining: Math.max(0, event.capacity - occupied) };
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sendEmail({
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
    console.error("SendGrid registration email failed", response.status, await response.text());
    throw new Error("Unable to send registration email.");
  }
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

const buttonStyle =
  "display:inline-block;background:#d11f2f;color:#fff;padding:13px 20px;text-decoration:none;font-weight:700";

function emailFrame(title: string, body: string) {
  return `<div style="background:#0b0b0c;padding:36px 18px;font-family:Arial,sans-serif;color:#f7f4ee">
    <div style="max-width:560px;margin:0 auto;border:1px solid #353538;background:#151517;padding:32px">
      <p style="margin:0 0 10px;color:#d11f2f;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">The Forge</p>
      <h1 style="margin:0 0 18px;font-size:27px">${escapeHtml(title)}</h1>
      <div style="color:#d7d4ce;line-height:1.65">${body}</div>
    </div>
  </div>`;
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
