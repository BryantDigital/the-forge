import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent } from "./auth";
import { requireAdminAccess } from "./adminAuth";
import { hasVolunteerAccessEvidence } from "../lib/volunteer-access";

export const connectMyVolunteer = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    const authUserId = user.userId ?? user._id;
    const normalizedEmail = normalizeEmail(user.email);
    const existing =
      (await ctx.db
        .query("volunteerMemberships")
        .withIndex("by_auth_user", (range) =>
          range.eq("authUserId", authUserId),
        )
        .first()) ??
      (await ctx.db
        .query("volunteerMemberships")
        .withIndex("by_normalized_email", (range) =>
          range.eq("normalizedEmail", normalizedEmail),
        )
        .first());

    if (existing) {
      if (existing.authUserId !== authUserId) {
        await ctx.db.patch(existing._id, {
          authUserId,
          updatedAt: Date.now(),
        });
      }
      return { connected: true, status: existing.status };
    }

    const submission = await findSignedApprovedSubmission(ctx, normalizedEmail);
    if (!submission) {
      return { connected: false, status: "not_approved" as const };
    }
    const membershipId = await createMembership(ctx, submission);
    await ctx.db.patch(membershipId, { authUserId, updatedAt: Date.now() });
    await writeAudit(ctx, {
      actorAuthUserId: authUserId,
      actorEmail: user.email,
      action: "volunteer.access_connected",
      submissionId: submission._id,
      summary: `${submission.firstName} ${submission.lastName} connected volunteer access`,
    });
    return { connected: true, status: "active" as const };
  },
});

export const getMyDashboard = query({
  args: {},
  handler: async (ctx) => {
    const identity = await getVolunteerIdentity(ctx);
    if (!identity) return null;
    if (identity.membership.status !== "active") {
      return {
        status: "revoked" as const,
        volunteer: {
          name: `${identity.submission.firstName} ${identity.submission.lastName}`,
          email: identity.submission.email,
          roles: identity.submission.roleInterests,
        },
        events: [],
      };
    }

    const [events, commitments] = await Promise.all([
      ctx.db
        .query("events")
        .withIndex("by_status_and_start", (range) =>
          range.eq("status", "published"),
        )
        .collect(),
      ctx.db
        .query("volunteerEventCommitments")
        .withIndex("by_membership", (range) =>
          range.eq("volunteerMembershipId", identity.membership._id),
        )
        .collect(),
    ]);
    const commitmentByEvent = new Map(
      commitments.map((commitment) => [commitment.eventId, commitment]),
    );

    return {
      status: "active" as const,
      volunteer: {
        name: `${identity.submission.firstName} ${identity.submission.lastName}`,
        email: identity.submission.email,
        roles: identity.submission.roleInterests,
      },
      events: events
        .filter((event) => event.startsAt >= Date.now())
        .sort((a, b) => a.startsAt - b.startsAt)
        .map((event) => {
          const commitment = commitmentByEvent.get(event._id);
          return {
            id: event._id,
            slug: event.slug,
            title: event.title,
            excerpt: event.excerpt,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            locationName: event.locationName,
            addressLine1: event.addressLine1,
            city: event.city,
            state: event.state,
            postalCode: event.postalCode,
            commitment:
              commitment?.status === "committed"
                ? {
                    id: commitment._id,
                    roles: commitment.roles,
                    committedAt: commitment.committedAt,
                  }
                : null,
          };
        }),
    };
  },
});

export const commitToEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const identity = await requireActiveVolunteer(ctx);
    const event = await ctx.db.get(args.eventId);
    if (
      !event ||
      event.status !== "published" ||
      event.startsAt < Date.now()
    ) {
      throw new ConvexError("This event is no longer available for volunteer signup.");
    }
    const now = Date.now();
    const existing = await ctx.db
      .query("volunteerEventCommitments")
      .withIndex("by_member_and_event", (range) =>
        range
          .eq("volunteerMembershipId", identity.membership._id)
          .eq("eventId", event._id),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        roles: identity.submission.roleInterests,
        status: "committed",
        committedAt: now,
        withdrawnAt: undefined,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("volunteerEventCommitments", {
        eventId: event._id,
        volunteerMembershipId: identity.membership._id,
        volunteerSubmissionId: identity.submission._id,
        roles: identity.submission.roleInterests,
        status: "committed",
        committedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
    await writeAudit(ctx, {
      actorAuthUserId: identity.authUserId,
      actorEmail: identity.user.email,
      action: "volunteer.event_committed",
      submissionId: identity.submission._id,
      summary: `${identity.submission.firstName} ${identity.submission.lastName} volunteered for ${event.title}`,
    });
    return { committed: true };
  },
});

export const withdrawFromEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const identity = await requireActiveVolunteer(ctx);
    const commitment = await ctx.db
      .query("volunteerEventCommitments")
      .withIndex("by_member_and_event", (range) =>
        range
          .eq("volunteerMembershipId", identity.membership._id)
          .eq("eventId", args.eventId),
      )
      .first();
    if (!commitment || commitment.status !== "committed") {
      throw new ConvexError("Volunteer commitment not found.");
    }
    const event = await ctx.db.get(args.eventId);
    const now = Date.now();
    await ctx.db.patch(commitment._id, {
      status: "withdrawn",
      withdrawnAt: now,
      updatedAt: now,
    });
    await writeAudit(ctx, {
      actorAuthUserId: identity.authUserId,
      actorEmail: identity.user.email,
      action: "volunteer.event_withdrawn",
      submissionId: identity.submission._id,
      summary: `${identity.submission.firstName} ${identity.submission.lastName} withdrew from ${event?.title ?? "an event"}`,
    });
    return { withdrawn: true };
  },
});

export const getEventRoster = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx, { allowCheckin: true });
    const commitments = await ctx.db
      .query("volunteerEventCommitments")
      .withIndex("by_event_and_status", (range) =>
        range.eq("eventId", args.eventId).eq("status", "committed"),
      )
      .collect();
    return Promise.all(
      commitments.map(async (commitment) => {
        const [submission, membership] = await Promise.all([
          ctx.db.get(commitment.volunteerSubmissionId),
          ctx.db.get(commitment.volunteerMembershipId),
        ]);
        if (!submission || !membership || membership.status !== "active") return null;
        return {
          id: commitment._id,
          volunteerSubmissionId: submission._id,
          name: `${submission.firstName} ${submission.lastName}`,
          email: submission.email,
          mobilePhone: submission.mobilePhone,
          roles: commitment.roles,
          committedAt: commitment.committedAt,
        };
      }),
    ).then((rows) =>
      rows
        .filter((row) => row !== null)
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  },
});

export const setAccess = mutation({
  args: {
    volunteerSubmissionId: v.id("volunteerSubmissions"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdminAccess(ctx);
    const submission = await ctx.db.get(args.volunteerSubmissionId);
    if (!submission) throw new ConvexError("Volunteer application not found.");
    if (!(await hasSignedApproval(ctx, submission))) {
      throw new ConvexError(
        "Volunteer access requires an approved application and signed agreement.",
      );
    }
    let membership =
      (await ctx.db
        .query("volunteerMemberships")
        .withIndex("by_submission", (range) =>
          range.eq("volunteerSubmissionId", submission._id),
        )
        .first()) ??
      (await ctx.db
        .query("volunteerMemberships")
        .withIndex("by_normalized_email", (range) =>
          range.eq("normalizedEmail", normalizeEmail(submission.email)),
        )
        .first());
    if (!membership) {
      const membershipId = await createMembership(ctx, submission);
      membership = await ctx.db.get(membershipId);
    }
    if (!membership) throw new ConvexError("Unable to create volunteer access.");

    const now = Date.now();
    await ctx.db.patch(membership._id, {
      status: args.enabled ? "active" : "revoked",
      revokedAt: args.enabled ? undefined : now,
      revokedByAuthUserId: args.enabled ? undefined : actor.authUserId,
      revokedByEmail: args.enabled ? undefined : actor.email,
      updatedAt: now,
    });
    if (!args.enabled) {
      const commitments = await ctx.db
        .query("volunteerEventCommitments")
        .withIndex("by_membership", (range) =>
          range.eq("volunteerMembershipId", membership._id),
        )
        .collect();
      for (const commitment of commitments) {
        if (commitment.status !== "committed") continue;
        const event = await ctx.db.get(commitment.eventId);
        if (event && event.startsAt >= now) {
          await ctx.db.patch(commitment._id, {
            status: "withdrawn",
            withdrawnAt: now,
            updatedAt: now,
          });
        }
      }
    }
    await writeAudit(ctx, {
      actorAuthUserId: actor.authUserId,
      actorEmail: actor.email,
      action: args.enabled
        ? "volunteer.access_restored"
        : "volunteer.access_revoked",
      submissionId: submission._id,
      summary: `${args.enabled ? "Restored" : "Revoked"} volunteer access for ${submission.firstName} ${submission.lastName}`,
    });
    return { status: args.enabled ? ("active" as const) : ("revoked" as const) };
  },
});

export const grantMembership = internalMutation({
  args: { volunteerSubmissionId: v.id("volunteerSubmissions") },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.volunteerSubmissionId);
    if (!submission || !(await hasSignedApproval(ctx, submission))) {
      throw new ConvexError("Signed volunteer approval is required.");
    }
    const membershipId = await createMembership(ctx, submission);
    return { membershipId };
  },
});

export const backfillApprovedMemberships = internalMutation({
  args: {},
  handler: async (ctx) => {
    const approved = await ctx.db
      .query("volunteerSubmissions")
      .withIndex("by_status_and_created", (range) =>
        range.eq("status", "approved"),
      )
      .collect();
    let created = 0;
    for (const submission of approved) {
      if (!(await hasSignedApproval(ctx, submission))) continue;
      const existing =
        (await ctx.db
          .query("volunteerMemberships")
          .withIndex("by_submission", (range) =>
            range.eq("volunteerSubmissionId", submission._id),
          )
          .first()) ??
        (await ctx.db
          .query("volunteerMemberships")
          .withIndex("by_normalized_email", (range) =>
            range.eq("normalizedEmail", normalizeEmail(submission.email)),
          )
          .first());
      if (!existing) {
        await createMembership(ctx, submission);
        created += 1;
      }
    }
    return { reviewed: approved.length, created };
  },
});

async function getVolunteerIdentity(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) return null;
  const authUserId = user.userId ?? user._id;
  const membership =
    (await ctx.db
      .query("volunteerMemberships")
      .withIndex("by_auth_user", (range) => range.eq("authUserId", authUserId))
      .first()) ??
    (await ctx.db
      .query("volunteerMemberships")
      .withIndex("by_normalized_email", (range) =>
        range.eq("normalizedEmail", normalizeEmail(user.email)),
      )
      .first());
  if (!membership) return null;
  const submission = await ctx.db.get(membership.volunteerSubmissionId);
  if (!submission) return null;
  return { user, authUserId, membership, submission };
}

async function requireActiveVolunteer(ctx: QueryCtx | MutationCtx) {
  const identity = await getVolunteerIdentity(ctx);
  if (!identity || identity.membership.status !== "active") {
    throw new ConvexError("Active volunteer access is required.");
  }
  return identity;
}

async function findSignedApprovedSubmission(
  ctx: QueryCtx | MutationCtx,
  normalizedEmail: string,
) {
  const submissions = await ctx.db
    .query("volunteerSubmissions")
    .withIndex("by_email", (range) => range.eq("email", normalizedEmail))
    .order("desc")
    .collect();
  for (const submission of submissions) {
    if (await hasSignedApproval(ctx, submission)) return submission;
  }
  return null;
}

async function hasSignedApproval(
  ctx: QueryCtx | MutationCtx,
  submission: Doc<"volunteerSubmissions">,
) {
  const evidence: Array<{
    status: string;
    signedDocumentStorageId?: string;
    documentSha256?: string;
  }> = [];
  if (submission.activeSignatureRequestId) {
    const active = await ctx.db.get(submission.activeSignatureRequestId);
    if (active) evidence.push(active);
  }
  const requests = await ctx.db
    .query("signatureRequests")
    .withIndex("by_volunteer", (range) =>
      range.eq("volunteerSubmissionId", submission._id),
    )
    .collect();
  evidence.push(...requests);
  return hasVolunteerAccessEvidence(
    submission.status,
    evidence,
  );
}

async function createMembership(
  ctx: MutationCtx,
  submission: Doc<"volunteerSubmissions">,
) {
  const existing =
    (await ctx.db
      .query("volunteerMemberships")
      .withIndex("by_submission", (range) =>
        range.eq("volunteerSubmissionId", submission._id),
      )
      .first()) ??
    (await ctx.db
      .query("volunteerMemberships")
      .withIndex("by_normalized_email", (range) =>
        range.eq("normalizedEmail", normalizeEmail(submission.email)),
      )
      .first());
  if (existing) {
    await ctx.db.patch(existing._id, {
      volunteerSubmissionId: submission._id,
      normalizedEmail: normalizeEmail(submission.email),
      email: submission.email,
      updatedAt: Date.now(),
    });
    return existing._id;
  }
  const now = Date.now();
  return ctx.db.insert("volunteerMemberships", {
    volunteerSubmissionId: submission._id,
    normalizedEmail: normalizeEmail(submission.email),
    email: submission.email,
    status: "active",
    grantedAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

async function writeAudit(
  ctx: MutationCtx,
  args: {
    actorAuthUserId?: string;
    actorEmail?: string;
    action: string;
    submissionId: Id<"volunteerSubmissions">;
    summary: string;
  },
) {
  await ctx.db.insert("auditLogs", {
    actorAuthUserId: args.actorAuthUserId,
    actorEmail: args.actorEmail,
    action: args.action,
    entityType: "volunteerSubmission",
    entityId: args.submissionId,
    summary: args.summary,
    createdAt: Date.now(),
  });
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}
