import { ConvexError, v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import { requireAdminAccess } from "./adminAuth";
import {
  ELECTRONIC_SIGNATURE_CONSENT,
  VOLUNTEER_AGREEMENT_BODY,
  VOLUNTEER_AGREEMENT_TITLE,
  VOLUNTEER_AGREEMENT_VERSION,
} from "./volunteerAgreement";

const ALLOWED_ROLES = new Set([
  "Forge Coach",
  "The Watchman",
  "Set-Up & Break-Down Volunteers",
  "Check-In / Greeter",
  "Media Volunteer",
  "Grill Master",
  "Pastoral Teacher",
  "Community Service Volunteer",
]);

const publicStatus = v.union(
  v.literal("new"),
  v.literal("denied"),
  v.literal("pending"),
  v.literal("approved"),
  v.literal("reviewing"),
  v.literal("contacted"),
  v.literal("closed"),
);

export const submit = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    mobilePhone: v.string(),
    roleInterests: v.array(v.string()),
    statementOfFaithAccepted: v.boolean(),
    faithResponse: v.string(),
    backgroundCheckAccepted: v.boolean(),
    website: v.optional(v.string()),
    submissionStartedAt: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.website?.trim()) {
      return { submissionId: null, accepted: true };
    }
    if (Date.now() - args.submissionStartedAt < 1_500) {
      throw new ConvexError("Please take a moment to review your application.");
    }

    const firstName = clean(args.firstName, 80);
    const lastName = clean(args.lastName, 80);
    const email = cleanEmail(args.email);
    const mobilePhone = normalizeUsPhone(args.mobilePhone);
    const faithResponse = clean(args.faithResponse, 3_000);
    const roleInterests = [...new Set(args.roleInterests)]
      .filter((role) => ALLOWED_ROLES.has(role))
      .slice(0, ALLOWED_ROLES.size);

    if (!firstName || !lastName) {
      throw new ConvexError("Enter your first and last name.");
    }
    if (!email) {
      throw new ConvexError("Enter a valid email address.");
    }
    if (!mobilePhone) {
      throw new ConvexError("Enter a valid 10-digit mobile number.");
    }
    if (roleInterests.length < 1) {
      throw new ConvexError("Select at least one volunteer position.");
    }
    if (!args.statementOfFaithAccepted) {
      throw new ConvexError("Affirm the Statement of Faith to continue.");
    }
    if (!faithResponse || faithResponse.length < 15) {
      throw new ConvexError("Please tell us a little more about who Jesus is to you.");
    }
    if (!args.backgroundCheckAccepted) {
      throw new ConvexError("Background-check willingness is required.");
    }

    const recent = await ctx.db
      .query("volunteerSubmissions")
      .withIndex("by_email", (range) => range.eq("email", email))
      .order("desc")
      .first();
    if (recent && Date.now() - recent.createdAt < 5 * 60 * 1000) {
      return { submissionId: recent._id, accepted: true };
    }

    const now = Date.now();
    const submissionId = await ctx.db.insert("volunteerSubmissions", {
      firstName,
      lastName,
      email,
      mobilePhone,
      backgroundCheckAccepted: true,
      roleInterests,
      statementOfFaithAccepted: true,
      faithResponse,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      action: "volunteer.submitted",
      entityType: "volunteerSubmission",
      entityId: submissionId,
      summary: `${firstName} ${lastName} submitted a volunteer application`,
      createdAt: now,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.volunteers.sendNewSubmissionNotification,
      { submissionId },
    );

    return { submissionId, accepted: true };
  },
});

export const getDashboardSummary = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminAccess(ctx);
    const submissions = await ctx.db.query("volunteerSubmissions").collect();
    return {
      newCount: submissions.filter((item) => item.status === "new").length,
      pendingCount: submissions.filter((item) => item.status === "pending").length,
      approvedCount: submissions.filter((item) => item.status === "approved").length,
      recent: submissions
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5)
        .map((item) => ({
          id: item._id,
          name: `${item.firstName} ${item.lastName}`,
          roles: item.roleInterests,
          status: item.status,
          createdAt: item.createdAt,
        })),
    };
  },
});

export const listAdmin = query({
  args: { status: v.optional(publicStatus) },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    const submissions = args.status
      ? await ctx.db
          .query("volunteerSubmissions")
          .withIndex("by_status_and_created", (range) =>
            range.eq("status", args.status!),
          )
          .order("desc")
          .collect()
      : await ctx.db.query("volunteerSubmissions").order("desc").collect();
    return submissions.map((item) => ({
      id: item._id,
      name: `${item.firstName} ${item.lastName}`,
      email: item.email,
      mobilePhone: item.mobilePhone,
      roles: item.roleInterests,
      status: item.status,
      createdAt: item.createdAt,
      reviewedAt: item.reviewedAt,
    }));
  },
});

export const getAdmin = query({
  args: { submissionId: v.id("volunteerSubmissions") },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) return null;
    const requests = await ctx.db
      .query("signatureRequests")
      .withIndex("by_volunteer", (range) =>
        range.eq("volunteerSubmissionId", submission._id),
      )
      .order("desc")
      .collect();
    const activeRequest = submission.activeSignatureRequestId
      ? await ctx.db.get(submission.activeSignatureRequestId)
      : requests[0];
    const events = activeRequest
      ? await ctx.db
          .query("signatureEvents")
          .withIndex("by_request", (range) =>
            range.eq("signatureRequestId", activeRequest._id),
          )
          .collect()
      : [];
    return {
      ...submission,
      name: `${submission.firstName} ${submission.lastName}`,
      signatureRequest: activeRequest
        ? {
            id: activeRequest._id,
            status: activeRequest.status,
            sentAt: activeRequest.emailSentAt,
            emailError: activeRequest.emailError,
            expiresAt: activeRequest.expiresAt,
            viewedAt: activeRequest.viewedAt,
            signedAt: activeRequest.signedAt,
            documentUrl: activeRequest.signedDocumentStorageId
              ? await ctx.storage.getUrl(activeRequest.signedDocumentStorageId)
              : null,
            documentSha256: activeRequest.documentSha256,
            events: events.sort((a, b) => b.createdAt - a.createdAt),
          }
        : null,
    };
  },
});

export const deny = mutation({
  args: {
    submissionId: v.id("volunteerSubmissions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdminAccess(ctx);
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new ConvexError("Volunteer application not found.");
    if (submission.status === "approved") {
      throw new ConvexError("An approved volunteer cannot be denied from this screen.");
    }
    const now = Date.now();
    const reason = clean(args.reason, 1_000) || undefined;
    if (submission.activeSignatureRequestId) {
      const request = await ctx.db.get(submission.activeSignatureRequestId);
      if (request?.status === "pending") {
        await ctx.db.patch(request._id, {
          status: "revoked",
          updatedAt: now,
        });
        await ctx.db.insert("signatureEvents", {
          signatureRequestId: request._id,
          volunteerSubmissionId: submission._id,
          type: "revoked",
          actorAuthUserId: actor.authUserId,
          actorEmail: actor.email,
          summary: "Signing request revoked when application was denied",
          createdAt: now,
        });
      }
    }
    await ctx.db.patch(submission._id, {
      status: "denied",
      denialReason: reason,
      reviewedByAuthUserId: actor.authUserId,
      reviewedByEmail: actor.email,
      reviewedAt: now,
      updatedAt: now,
    });
    await writeAudit(
      ctx,
      actor,
      "volunteer.denied",
      submission._id,
      `Denied ${submission.firstName} ${submission.lastName}${reason ? `: ${reason}` : ""}`,
    );
    return { status: "denied" as const };
  },
});

export const accept = action({
  args: { submissionId: v.id("volunteerSubmissions") },
  handler: async (ctx, args): Promise<{ status: "pending"; emailSent: boolean }> => {
    const actor = await ctx.runQuery(internal.volunteers.getAdminActor, {});
    const rawToken = randomToken();
    const tokenHash = await sha256(rawToken);
    const request = await ctx.runMutation(
      internal.volunteers.createSignatureRequest,
      {
        submissionId: args.submissionId,
        actorAuthUserId: actor.authUserId,
        actorEmail: actor.email,
        tokenHash,
      },
    );

    try {
      await sendEmail({
        to: request.signerEmail,
        subject: "Your Forge volunteer agreement is ready",
        text: `The Forge has reviewed your volunteer application. Review and sign your volunteer agreement here: ${siteUrl()}/sign/volunteer/${rawToken}`,
        html: signingInvitationEmail(
          request.signerName,
          `${siteUrl()}/sign/volunteer/${rawToken}`,
        ),
      });
      await ctx.runMutation(internal.volunteers.recordSignatureEmailResult, {
        signatureRequestId: request.signatureRequestId,
        sent: true,
      });
      return { status: "pending", emailSent: true };
    } catch (error) {
      await ctx.runMutation(internal.volunteers.recordSignatureEmailResult, {
        signatureRequestId: request.signatureRequestId,
        sent: false,
        error: safeError(error),
      });
      return { status: "pending", emailSent: false };
    }
  },
});

export const getSigningRequest = query({
  args: { tokenHash: v.string() },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("signatureRequests")
      .withIndex("by_token_hash", (range) => range.eq("tokenHash", args.tokenHash))
      .unique();
    if (!request) return null;
    const submission = await ctx.db.get(request.volunteerSubmissionId);
    if (!submission) return null;
    const expired = request.status === "pending" && request.expiresAt <= Date.now();
    return {
      requestId: request._id,
      status: expired ? ("expired" as const) : request.status,
      title: request.documentTitle,
      body: request.documentBody,
      templateVersion: request.templateVersion,
      signerName: request.signerName,
      signerEmail: request.signerEmail,
      electronicConsentText: request.electronicConsentText,
      expiresAt: request.expiresAt,
      signedAt: request.signedAt,
      documentUrl: request.signedDocumentStorageId
        ? await ctx.storage.getUrl(request.signedDocumentStorageId)
        : null,
    };
  },
});

export const markViewed = mutation({
  args: { tokenHash: v.string() },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("signatureRequests")
      .withIndex("by_token_hash", (range) => range.eq("tokenHash", args.tokenHash))
      .unique();
    if (!request || request.status !== "pending" || request.viewedAt) return;
    const now = Date.now();
    await ctx.db.patch(request._id, { viewedAt: now, updatedAt: now });
    await ctx.db.insert("signatureEvents", {
      signatureRequestId: request._id,
      volunteerSubmissionId: request.volunteerSubmissionId,
      type: "viewed",
      summary: "Volunteer opened the signing request",
      createdAt: now,
    });
  },
});

export const getAdminActor = internalQuery({
  args: {},
  handler: async (ctx) => requireAdminAccess(ctx),
});

export const createSignatureRequest = internalMutation({
  args: {
    submissionId: v.id("volunteerSubmissions"),
    actorAuthUserId: v.string(),
    actorEmail: v.string(),
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new ConvexError("Volunteer application not found.");
    if (!["new", "denied", "pending", "reviewing", "contacted"].includes(submission.status)) {
      throw new ConvexError("This application has already been reviewed.");
    }
    const now = Date.now();
    if (submission.status === "pending" && submission.activeSignatureRequestId) {
      const previous = await ctx.db.get(submission.activeSignatureRequestId);
      if (previous?.status === "pending") {
        await ctx.db.patch(previous._id, {
          status: "revoked",
          updatedAt: now,
        });
        await ctx.db.insert("signatureEvents", {
          signatureRequestId: previous._id,
          volunteerSubmissionId: submission._id,
          type: "revoked",
          actorAuthUserId: args.actorAuthUserId,
          actorEmail: args.actorEmail,
          summary: "Previous signing link revoked and replaced",
          createdAt: now,
        });
      }
    }
    const signerName = `${submission.firstName} ${submission.lastName}`;
    const signatureRequestId = await ctx.db.insert("signatureRequests", {
      volunteerSubmissionId: submission._id,
      templateVersion: VOLUNTEER_AGREEMENT_VERSION,
      documentTitle: VOLUNTEER_AGREEMENT_TITLE,
      documentBody: VOLUNTEER_AGREEMENT_BODY,
      status: "pending",
      tokenHash: args.tokenHash,
      signerName,
      signerEmail: submission.email,
      expiresAt: now + 14 * 24 * 60 * 60 * 1000,
      electronicConsentText: ELECTRONIC_SIGNATURE_CONSENT,
      createdByAuthUserId: args.actorAuthUserId,
      createdByEmail: args.actorEmail,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(submission._id, {
      status: "pending",
      denialReason: undefined,
      reviewedByAuthUserId: args.actorAuthUserId,
      reviewedByEmail: args.actorEmail,
      reviewedAt: now,
      activeSignatureRequestId: signatureRequestId,
      updatedAt: now,
    });
    await ctx.db.insert("signatureEvents", {
      signatureRequestId,
      volunteerSubmissionId: submission._id,
      type: "created",
      actorAuthUserId: args.actorAuthUserId,
      actorEmail: args.actorEmail,
      summary: "Volunteer agreement created",
      createdAt: now,
    });
    await ctx.db.insert("auditLogs", {
      actorAuthUserId: args.actorAuthUserId,
      actorEmail: args.actorEmail,
      action: "volunteer.accepted_pending_signature",
      entityType: "volunteerSubmission",
      entityId: submission._id,
      summary: `Accepted ${signerName}; signature pending`,
      createdAt: now,
    });
    return {
      signatureRequestId,
      signerName,
      signerEmail: submission.email,
    };
  },
});

export const recordSignatureEmailResult = internalMutation({
  args: {
    signatureRequestId: v.id("signatureRequests"),
    sent: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.signatureRequestId);
    if (!request) return;
    const now = Date.now();
    await ctx.db.patch(request._id, {
      emailSentAt: args.sent ? now : undefined,
      emailError: args.error,
      updatedAt: now,
    });
    if (args.sent) {
      await ctx.db.insert("signatureEvents", {
        signatureRequestId: request._id,
        volunteerSubmissionId: request.volunteerSubmissionId,
        type: "email_sent",
        summary: `Signing invitation emailed to ${request.signerEmail}`,
        createdAt: now,
      });
    }
  },
});

export const getSigningContext = internalQuery({
  args: { tokenHash: v.string() },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("signatureRequests")
      .withIndex("by_token_hash", (range) => range.eq("tokenHash", args.tokenHash))
      .unique();
    if (
      !request ||
      request.status !== "pending" ||
      request.expiresAt <= Date.now()
    ) {
      return null;
    }
    const submission = await ctx.db.get(request.volunteerSubmissionId);
    if (!submission || submission.status !== "pending") return null;
    return { request, submission };
  },
});

export const completeSignature = internalMutation({
  args: {
    signatureRequestId: v.id("signatureRequests"),
    storageId: v.id("_storage"),
    documentSha256: v.string(),
    signatureText: v.string(),
    signedAt: v.number(),
    consentAcceptedAt: v.number(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.signatureRequestId);
    if (
      !request ||
      request.status !== "pending" ||
      request.expiresAt <= Date.now()
    ) {
      throw new ConvexError("This signing request is no longer available.");
    }
    const submission = await ctx.db.get(request.volunteerSubmissionId);
    if (!submission || submission.status !== "pending") {
      throw new ConvexError("This volunteer application is no longer pending.");
    }
    const now = Date.now();
    await ctx.db.patch(request._id, {
      status: "signed",
      signatureText: args.signatureText,
      signedAt: args.signedAt,
      electronicConsentAcceptedAt: args.consentAcceptedAt,
      signedDocumentStorageId: args.storageId,
      documentSha256: args.documentSha256,
      signerUserAgent: args.userAgent,
      updatedAt: now,
    });
    await ctx.db.patch(submission._id, {
      status: "approved",
      updatedAt: now,
    });
    await ctx.db.insert("signatureEvents", {
      signatureRequestId: request._id,
      volunteerSubmissionId: submission._id,
      type: "signed",
      actorEmail: request.signerEmail,
      summary: `${request.signerName} signed the volunteer agreement`,
      createdAt: now,
    });
    await ctx.db.insert("auditLogs", {
      actorEmail: request.signerEmail,
      action: "volunteer.agreement_signed",
      entityType: "volunteerSubmission",
      entityId: submission._id,
      summary: `${request.signerName} signed agreement ${request.templateVersion}; volunteer approved`,
      createdAt: now,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.volunteers.sendSignedConfirmation,
      { signatureRequestId: request._id },
    );
    return { volunteerSubmissionId: submission._id };
  },
});

export const getSignedEmailContext = internalQuery({
  args: { signatureRequestId: v.id("signatureRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.signatureRequestId);
    if (!request?.signedDocumentStorageId || request.status !== "signed") return null;
    return {
      signerName: request.signerName,
      signerEmail: request.signerEmail,
      documentUrl: await ctx.storage.getUrl(request.signedDocumentStorageId),
    };
  },
});

export const sendSignedConfirmation = internalAction({
  args: { signatureRequestId: v.id("signatureRequests") },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.volunteers.getSignedEmailContext,
      args,
    );
    if (!context?.documentUrl) return;
    await sendEmail({
      to: context.signerEmail,
      subject: "Your Forge volunteer agreement is complete",
      text: `Thank you, ${context.signerName}. Your volunteer agreement is signed and your application is approved. Download your copy: ${context.documentUrl}`,
      html: signedConfirmationEmail(
        context.signerName,
        context.documentUrl,
      ),
    });
  },
});

export const sendNewSubmissionNotification = internalAction({
  args: { submissionId: v.id("volunteerSubmissions") },
  handler: async (ctx, args) => {
    const submission = await ctx.runQuery(
      internal.volunteers.getSubmissionForNotification,
      args,
    );
    if (!submission || submission.notificationSentAt) return;
    const recipient =
      process.env.VOLUNTEER_NOTIFICATION_EMAIL ??
      "dave.greninger77@gmail.com";
    await sendEmail({
      to: recipient,
      subject: `New Forge volunteer application: ${submission.firstName} ${submission.lastName}`,
      text: `${submission.firstName} ${submission.lastName} submitted a volunteer application for ${submission.roleInterests.join(", ")}. Review it at ${siteUrl()}/admin/volunteers/${submission._id}`,
      html: newApplicationEmail(
        `${submission.firstName} ${submission.lastName}`,
        submission.roleInterests,
        `${siteUrl()}/admin/volunteers/${submission._id}`,
      ),
    });
    await ctx.runMutation(internal.volunteers.markNotificationSent, args);
  },
});

export const getSubmissionForNotification = internalQuery({
  args: { submissionId: v.id("volunteerSubmissions") },
  handler: async (ctx, args) => ctx.db.get(args.submissionId),
});

export const markNotificationSent = internalMutation({
  args: { submissionId: v.id("volunteerSubmissions") },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (submission && !submission.notificationSentAt) {
      await ctx.db.patch(submission._id, {
        notificationSentAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

async function writeAudit(
  ctx: MutationCtx,
  actor: { authUserId: string; email: string },
  action: string,
  entityId: string,
  summary: string,
) {
  await ctx.db.insert("auditLogs", {
    actorAuthUserId: actor.authUserId,
    actorEmail: actor.email,
    action,
    entityType: "volunteerSubmission",
    entityId,
    summary,
    createdAt: Date.now(),
  });
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
  const apiKey = requiredEnv("SENDGRID_API_KEY");
  const fromEmail = requiredEnv("SENDGRID_FROM_EMAIL");
  const fromName = process.env.SENDGRID_FROM_NAME ?? "The Forge";
  const replyTo = process.env.SENDGRID_REPLY_TO_EMAIL;
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: fromName },
      ...(replyTo ? { reply_to: { email: replyTo } } : {}),
      subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`SendGrid delivery failed (${response.status})`);
  }
}

function emailFrame(eyebrow: string, title: string, body: string) {
  return `<!doctype html><html lang="en"><body style="margin:0;background:#0a0a0b"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0b;border-collapse:collapse"><tr><td height="6" style="background:#b81921"></td></tr><tr><td style="padding:34px 16px 44px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:0 auto"><tr><td style="padding:0 4px 24px"><img src="${siteUrl()}/images/forge-logo-white.png" width="220" alt="The Forge" style="display:block;width:220px;max-width:70%;height:auto"></td></tr><tr><td style="padding:38px;background:#f8f4ed;color:#171616;font-family:Arial,Helvetica,sans-serif"><p style="margin:0 0 12px;color:#b81921;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase">${escapeHtml(eyebrow)}</p><h1 style="margin:0 0 20px;font-family:Impact,'Arial Narrow',Arial,sans-serif;font-size:36px;line-height:1.05;text-transform:uppercase">${escapeHtml(title)}</h1>${body}</td></tr><tr><td style="padding:22px 4px;color:#999;font:12px/1.6 Arial,Helvetica,sans-serif"><strong style="color:#fff">FAITH · FITNESS · FELLOWSHIP · FUN</strong><br>The Forge Christian Ministries · Virginia Beach, Virginia</td></tr></table></td></tr></table></body></html>`;
}

function newApplicationEmail(name: string, roles: string[], url: string) {
  return emailFrame(
    "New volunteer application",
    `${escapeHtml(name)} raised a hand.`,
    `<p style="font-size:16px;line-height:1.65;color:#4d4944">Interested in: <strong>${roles.map(escapeHtml).join(", ")}</strong></p>${emailButton("Review application", url)}`,
  );
}

function signingInvitationEmail(name: string, url: string) {
  return emailFrame(
    "Volunteer next step",
    "Your agreement is ready.",
    `<p style="font-size:16px;line-height:1.65;color:#4d4944">${escapeHtml(name)}, The Forge has reviewed your application. Please read and electronically sign the volunteer commitment to complete your approval.</p>${emailButton("Review and sign", url)}<p style="margin:22px 0 0;color:#706a62;font-size:13px">This secure link expires in 14 days.</p>`,
  );
}

function signedConfirmationEmail(name: string, url: string) {
  return emailFrame(
    "Application approved",
    "Welcome to the mission.",
    `<p style="font-size:16px;line-height:1.65;color:#4d4944">Thank you, ${escapeHtml(name)}. Your agreement is signed and your volunteer application is approved. A Forge leader will contact you about the next opportunity to serve.</p>${emailButton("Download signed agreement", url)}`,
  );
}

function emailButton(label: string, url: string) {
  return `<p style="margin:28px 0 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:15px 22px;background:#b81921;color:#fff;text-decoration:none;font-weight:800;letter-spacing:.05em;text-transform:uppercase">${escapeHtml(label)} →</a></p>`;
}

function siteUrl() {
  return (process.env.SITE_URL ?? "https://the-forge-sooty-nine.vercel.app").replace(/\/$/, "");
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function cleanEmail(value: unknown) {
  const email = clean(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizeUsPhone(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return national.length === 10 ? `+1${national}` : "";
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

function safeError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 500) : "Email delivery failed.";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
