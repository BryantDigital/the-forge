import { ConvexError, v } from "convex/values";
import { internalAction, mutation } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent } from "./auth";

const childInput = v.object({
  firstName: v.string(),
  lastName: v.string(),
  birthDate: v.string(),
  statedAge: v.number(),
  allergies: v.optional(v.string()),
  notes: v.optional(v.string()),
});

export const createMyHousehold = mutation({
  args: {
    parentFirstName: v.string(),
    parentLastName: v.string(),
    mobilePhone: v.string(),
    emergencyContactName: v.string(),
    emergencyContactPhone: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const normalizedEmail = normalizeEmail(user.email);
    const existingIdentity = await getIdentity(ctx);
    if (existingIdentity) {
      return { householdId: existingIdentity.household._id, created: false };
    }
    const existingHousehold = await ctx.db
      .query("households")
      .withIndex("by_normalized_email", (range) =>
        range.eq("normalizedEmail", normalizedEmail),
      )
      .first();
    if (existingHousehold) {
      throw new ConvexError("This email is already connected to a Forge family.");
    }

    const now = Date.now();
    const parentFirstName = requiredText(args.parentFirstName, "Enter your first name.");
    const parentLastName = requiredText(args.parentLastName, "Enter your last name.");
    const mobilePhone = validatePhone(args.mobilePhone, "Enter a valid mobile number.");
    const emergencyContactName = requiredText(
      args.emergencyContactName,
      "Enter an emergency contact.",
    );
    const emergencyContactPhone = validatePhone(
      args.emergencyContactPhone,
      "Enter a valid emergency contact number.",
    );
    const authUserId = user.userId ?? user._id;
    const householdId = await ctx.db.insert("households", {
      normalizedEmail,
      email: user.email.trim(),
      parentFirstName,
      parentLastName,
      mobilePhone,
      emergencyContactName,
      emergencyContactPhone,
      authUserId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("householdMembers", {
      householdId,
      normalizedEmail,
      email: user.email.trim(),
      displayName: `${parentFirstName} ${parentLastName}`,
      role: "primary",
      status: "active",
      authUserId,
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await writeAudit(ctx, {
      authUserId,
      email: user.email,
      action: "household.created",
      householdId,
      summary: `${parentFirstName} ${parentLastName} created a family account`,
    });
    return { householdId, created: true };
  },
});

export const addChildProfile = mutation({
  args: { child: childInput },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const child = validateChild(args.child);
    const existing = await ctx.db
      .query("children")
      .withIndex("by_household", (range) =>
        range.eq("householdId", identity.household._id),
      )
      .collect();
    if (
      existing.some(
        (candidate) =>
          !candidate.archivedAt &&
          candidate.firstName.toLowerCase() === child.firstName.toLowerCase() &&
          candidate.lastName.toLowerCase() === child.lastName.toLowerCase() &&
          candidate.birthDate === child.birthDate,
      )
    ) {
      throw new ConvexError("This child is already saved in your household.");
    }
    if (existing.filter((candidate) => !candidate.archivedAt).length >= 20) {
      throw new ConvexError("A household can save up to 20 child profiles.");
    }
    const now = Date.now();
    const childId = await ctx.db.insert("children", {
      householdId: identity.household._id,
      ...child,
      createdAt: now,
      updatedAt: now,
    });
    await writeAudit(ctx, {
      authUserId: identity.authUserId,
      email: identity.user.email,
      action: "household.child_added",
      householdId: identity.household._id,
      summary: `Added ${child.firstName} ${child.lastName} to the family account`,
    });
    return { childId };
  },
});

export const updateChildProfile = mutation({
  args: {
    childId: v.id("children"),
    child: childInput,
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const existing = await ctx.db.get(args.childId);
    if (
      !existing ||
      existing.householdId !== identity.household._id ||
      existing.archivedAt
    ) {
      throw new ConvexError("Child profile not found.");
    }
    const child = validateChild(args.child);
    await ctx.db.patch(existing._id, {
      ...child,
      updatedAt: Date.now(),
    });
    await writeAudit(ctx, {
      authUserId: identity.authUserId,
      email: identity.user.email,
      action: "household.child_updated",
      householdId: identity.household._id,
      summary: `Updated ${child.firstName} ${child.lastName}'s family profile`,
    });
    return { childId: existing._id };
  },
});

export const inviteAdult = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const normalizedEmail = normalizeEmail(args.email);
    if (!isEmail(normalizedEmail)) {
      throw new ConvexError("Enter a valid email address.");
    }
    if (normalizedEmail === normalizeEmail(identity.user.email)) {
      throw new ConvexError("You are already connected to this household.");
    }

    const conflictingHousehold = await ctx.db
      .query("households")
      .withIndex("by_normalized_email", (range) =>
        range.eq("normalizedEmail", normalizedEmail),
      )
      .first();
    if (
      conflictingHousehold &&
      conflictingHousehold._id !== identity.household._id
    ) {
      throw new ConvexError(
        "That email is already the primary contact for another household. Contact The Forge for help combining records.",
      );
    }

    const matchingMembers = await ctx.db
      .query("householdMembers")
      .withIndex("by_normalized_email", (range) =>
        range.eq("normalizedEmail", normalizedEmail),
      )
      .collect();
    const conflict = matchingMembers.find(
      (member) => member.householdId !== identity.household._id,
    );
    if (conflict) {
      throw new ConvexError("That email is already linked to another household.");
    }

    const now = Date.now();
    const existing = matchingMembers.find(
      (member) => member.householdId === identity.household._id,
    );
    if (existing?.status === "active") {
      throw new ConvexError("That parent is already connected to this household.");
    }
    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email.trim(),
        invitedByAuthUserId: identity.authUserId,
        invitedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("householdMembers", {
        householdId: identity.household._id,
        normalizedEmail,
        email: args.email.trim(),
        displayName: "Invited parent",
        role: "adult",
        status: "invited",
        invitedByAuthUserId: identity.authUserId,
        invitedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    await writeAudit(ctx, {
      authUserId: identity.authUserId,
      email: identity.user.email,
      action: existing ? "household.invitation_resent" : "household.invited",
      householdId: identity.household._id,
      summary: `Invited ${args.email.trim()} to the family account`,
    });
    await ctx.scheduler.runAfter(0, internal.households.sendAdultInvitation, {
      email: args.email.trim(),
      inviterName:
        identity.member?.displayName ||
        `${identity.household.parentFirstName} ${identity.household.parentLastName}`,
    });
    return { invited: true };
  },
});

export const sendAdultInvitation = internalAction({
  args: {
    email: v.string(),
    inviterName: v.string(),
  },
  handler: async (_ctx, args) => {
    const siteUrl = requiredEnv("SITE_URL").replace(/\/$/, "");
    const accountUrl = `${siteUrl}/account`;
    await sendEmail({
      to: args.email,
      subject: `${args.inviterName} invited you to their Forge family account`,
      text: `${args.inviterName} invited you to share their Forge family account. Sign in with this email address to see the household, saved children, and event registrations: ${accountUrl}`,
      html: emailFrame(
        "Your family, together.",
        `<p style="margin:0 0 18px"><strong>${escapeHtml(args.inviterName)}</strong> invited you to share their Forge family account.</p>
         <p style="margin:0 0 22px">Sign in using <strong>${escapeHtml(args.email)}</strong>. After the email code is verified, you’ll be connected to the same household, saved children, and event registrations.</p>
         <p style="margin:0"><a href="${accountUrl}" style="${buttonStyle}">Join family account&nbsp; →</a></p>`,
      ),
    });
    return { sent: true };
  },
});

async function getIdentity(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) return null;
  const authUserId = user.userId ?? user._id;
  const byAuthUser = await ctx.db
    .query("householdMembers")
    .withIndex("by_auth_user", (range) => range.eq("authUserId", authUserId))
    .first();
  const member =
    byAuthUser ??
    (await ctx.db
      .query("householdMembers")
      .withIndex("by_normalized_email", (range) =>
        range.eq("normalizedEmail", normalizeEmail(user.email)),
      )
      .first());
  if (member) {
    const household = await ctx.db.get(member.householdId);
    if (household) return { user, authUserId, household, member };
  }

  const legacy =
    (await ctx.db
      .query("households")
      .withIndex("by_auth_user", (range) => range.eq("authUserId", authUserId))
      .first()) ??
    (await ctx.db
      .query("households")
      .withIndex("by_normalized_email", (range) =>
        range.eq("normalizedEmail", normalizeEmail(user.email)),
      )
      .first());
  return legacy ? { user, authUserId, household: legacy, member: null } : null;
}

async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await getIdentity(ctx);
  if (!identity) throw new ConvexError("Create or connect a family account first.");
  return identity;
}

function validateChild(value: {
  firstName: string;
  lastName: string;
  birthDate: string;
  statedAge: number;
  allergies?: string;
  notes?: string;
}) {
  const firstName = requiredText(value.firstName, "Enter the child's first name.");
  const lastName = requiredText(value.lastName, "Enter the child's last name.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.birthDate)) {
    throw new ConvexError("Enter a valid birth date.");
  }
  const birthDate = new Date(`${value.birthDate}T12:00:00Z`);
  if (
    Number.isNaN(birthDate.getTime()) ||
    birthDate.getTime() > Date.now() ||
    birthDate.getUTCFullYear() < 2000
  ) {
    throw new ConvexError("Enter a valid birth date.");
  }
  if (!Number.isInteger(value.statedAge) || value.statedAge < 1 || value.statedAge > 21) {
    throw new ConvexError("Enter an age between 1 and 21.");
  }
  return {
    firstName,
    lastName,
    birthDate: value.birthDate,
    statedAge: value.statedAge,
    allergies: optionalText(value.allergies, 500),
    notes: optionalText(value.notes, 1000),
  };
}

function requiredText(value: string, message: string) {
  const clean = value.trim().replace(/\s+/g, " ");
  if (!clean || clean.length > 100) throw new ConvexError(message);
  return clean;
}

function optionalText(value: string | undefined, maxLength: number) {
  const clean = value?.trim().replace(/\s+/g, " ");
  if (!clean) return undefined;
  if (clean.length > maxLength) throw new ConvexError("One of the entries is too long.");
  return clean;
}

function validatePhone(value: string, message: string) {
  const clean = value.trim();
  if (clean.replace(/\D/g, "").length < 10 || clean.length > 30) {
    throw new ConvexError(message);
  }
  return clean;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function writeAudit(
  ctx: MutationCtx,
  args: {
    authUserId: string;
    email: string;
    action: string;
    householdId: string;
    summary: string;
  },
) {
  await ctx.db.insert("auditLogs", {
    actorAuthUserId: args.authUserId,
    actorEmail: args.email,
    action: args.action,
    entityType: "household",
    entityId: args.householdId,
    summary: args.summary,
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
    console.error("SendGrid household invitation failed", response.status, await response.text());
    throw new Error("Unable to send household invitation.");
  }
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

const buttonStyle =
  "display:inline-block;background:#b81921;color:#ffffff;padding:15px 22px;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase";

function emailFrame(title: string, body: string) {
  const siteUrl = (process.env.SITE_URL ?? "https://forgeva.com").replace(/\/$/, "");
  return `<!doctype html>
  <html lang="en">
    <body style="margin:0;padding:0;background:#0a0a0b">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#0a0a0b">
        <tr><td height="6" style="height:6px;background:#b81921"></td></tr>
        <tr><td style="padding:34px 16px 42px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:0 auto;border-collapse:collapse">
            <tr><td style="padding:0 4px 26px"><img src="${siteUrl}/images/forge-logo-white.png" width="220" alt="The Forge" style="display:block;width:220px;max-width:70%;height:auto;border:0"></td></tr>
            <tr><td style="padding:38px;background:#f8f4ed;color:#171616;font-family:Arial,Helvetica,sans-serif">
              <p style="margin:0 0 12px;color:#b81921;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase">Shared family account</p>
              <h1 style="margin:0 0 22px;color:#0d0d0e;font-family:Impact,'Arial Narrow',Arial,sans-serif;font-size:38px;line-height:1.02;text-transform:uppercase">${escapeHtml(title)}</h1>
              <div style="color:#4d4944;font-size:16px;line-height:1.65">${body}</div>
            </td></tr>
            <tr><td style="padding:24px 4px 0;color:#908d87;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6"><strong style="color:#fff;letter-spacing:.08em;text-transform:uppercase">Faith · Fitness · Fellowship · Fun</strong><br>The Forge Christian Ministries · Virginia Beach, Virginia</td></tr>
          </table>
        </td></tr>
      </table>
    </body>
  </html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
