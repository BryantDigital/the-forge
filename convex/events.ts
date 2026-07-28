import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireAdminAccess } from "./adminAuth";

const eventStatus = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("cancelled"),
  v.literal("completed"),
);

const eventFields = {
  slug: v.string(),
  title: v.string(),
  excerpt: v.string(),
  description: v.string(),
  locationName: v.string(),
  addressLine1: v.optional(v.string()),
  addressLine2: v.optional(v.string()),
  city: v.string(),
  state: v.string(),
  postalCode: v.string(),
  startsAt: v.number(),
  endsAt: v.number(),
  enrollmentOpensAt: v.number(),
  registrationClosesAt: v.number(),
  capacity: v.number(),
  lowCapacityThreshold: v.number(),
  status: eventStatus,
};

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_status_and_start", (range) => range.eq("status", "published"))
      .order("asc")
      .collect();

    return Promise.all(events.map((event) => presentEvent(ctx, event)));
  },
});

export const getPublishedBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (range) => range.eq("slug", args.slug))
      .unique();

    if (!event || event.status !== "published") {
      return null;
    }

    return presentEvent(ctx, event);
  },
});

export const listAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminAccess(ctx);
    const events = await ctx.db.query("events").withIndex("by_start").order("desc").collect();
    return Promise.all(events.map((event) => presentEvent(ctx, event)));
  },
});

export const getAdminBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx, { allowCheckin: true });
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (range) => range.eq("slug", args.slug))
      .unique();
    return event ? presentEvent(ctx, event) : null;
  },
});

export const getRoster = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx, { allowCheckin: true });
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (range) => range.eq("slug", args.slug))
      .unique();
    if (!event) return null;

    const children = await ctx.db
      .query("registrationChildren")
      .withIndex("by_event_and_last_name", (range) => range.eq("eventId", event._id))
      .collect();

    return children
      .filter((child) => child.status === "active")
      .sort(
        (a, b) =>
          a.lastName.localeCompare(b.lastName) ||
          a.firstName.localeCompare(b.firstName),
      )
      .map((child) => ({
        id: child._id,
        name: `${child.firstName} ${child.lastName}`,
        age: child.statedAge,
        notes: [child.allergies, child.notes].filter(Boolean).join(" · "),
        checkedIn: Boolean(child.checkedInAt),
      }));
  },
});

export const getParentRoster = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (range) => range.eq("slug", args.slug))
      .unique();
    if (!event) return null;

    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_event", (range) => range.eq("eventId", event._id))
      .collect();

    const rows = await Promise.all(
      registrations
        .filter((registration) => registration.status !== "cancelled")
        .map(async (registration) => {
          const [household, children] = await Promise.all([
            ctx.db.get(registration.householdId),
            ctx.db
              .query("registrationChildren")
              .withIndex("by_registration", (range) =>
                range.eq("registrationId", registration._id),
              )
              .collect(),
          ]);
          if (!household) return null;

          return {
            id: registration._id,
            parentName: `${household.parentFirstName} ${household.parentLastName}`,
            parentLastName: household.parentLastName,
            email: household.email,
            mobilePhone: household.mobilePhone,
            childCount: children.filter((child) => child.status === "active").length,
            status: registration.status,
            emailNotificationsEnabled: registration.emailNotificationsEnabled,
            smsNotificationsEnabled: registration.smsNotificationsEnabled,
            createdAt: registration.createdAt,
          };
        }),
    );

    return rows
      .filter((row) => row !== null)
      .sort(
        (a, b) =>
          a.parentLastName.localeCompare(b.parentLastName) ||
          a.parentName.localeCompare(b.parentName),
      );
  },
});

export const setChildCheckIn = mutation({
  args: {
    registrationChildId: v.id("registrationChildren"),
    checkedIn: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdminAccess(ctx, { allowCheckin: true });
    const child = await ctx.db.get(args.registrationChildId);
    if (!child || child.status !== "active") {
      throw new ConvexError("This child is not on the active event roster.");
    }

    await ctx.db.patch(args.registrationChildId, {
      checkedInAt: args.checkedIn ? Date.now() : undefined,
      checkedInByAuthUserId: args.checkedIn ? actor.authUserId : undefined,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("auditLogs", {
      actorAuthUserId: actor.authUserId,
      actorEmail: actor.email,
      action: args.checkedIn ? "attendance.checked_in" : "attendance.check_in_removed",
      entityType: "registrationChild",
      entityId: args.registrationChildId,
      summary: `${args.checkedIn ? "Checked in" : "Removed check-in for"} ${child.firstName} ${child.lastName}`,
      createdAt: Date.now(),
    });
    return { checkedIn: args.checkedIn };
  },
});

export const create = mutation({
  args: eventFields,
  handler: async (ctx, args) => {
    const actor = await requireAdminAccess(ctx);
    validateEvent(args);

    const existing = await ctx.db
      .query("events")
      .withIndex("by_slug", (range) => range.eq("slug", args.slug))
      .unique();
    if (existing) {
      throw new ConvexError("An event already uses this URL slug.");
    }

    const now = Date.now();
    const eventId = await ctx.db.insert("events", {
      ...cleanEventFields(args),
      timezone: "America/New_York",
      createdByAuthUserId: actor.authUserId,
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(ctx, actor, "event.created", eventId, `Created ${args.title}`);
    return { eventId, slug: args.slug };
  },
});

export const update = mutation({
  args: {
    eventId: v.id("events"),
    ...eventFields,
  },
  handler: async (ctx, args) => {
    const actor = await requireAdminAccess(ctx);
    const existing = await ctx.db.get(args.eventId);
    if (!existing) {
      throw new ConvexError("Event not found.");
    }
    validateEvent(args);

    const slugOwner = await ctx.db
      .query("events")
      .withIndex("by_slug", (range) => range.eq("slug", args.slug))
      .unique();
    if (slugOwner && slugOwner._id !== args.eventId) {
      throw new ConvexError("An event already uses this URL slug.");
    }

    await ctx.db.patch(args.eventId, {
      ...cleanEventFields(args),
      updatedAt: Date.now(),
    });
    await writeAuditLog(ctx, actor, "event.updated", args.eventId, `Updated ${args.title}`);
    return { eventId: args.eventId, slug: args.slug };
  },
});

async function presentEvent(ctx: QueryCtx, event: Doc<"events">) {
  const [confirmed, waitlisted, imageUrl] = await Promise.all([
    ctx.db
      .query("registrations")
      .withIndex("by_event_and_status", (range) =>
        range.eq("eventId", event._id).eq("status", "confirmed"),
      )
      .collect(),
    ctx.db
      .query("registrations")
      .withIndex("by_event_and_status", (range) =>
        range.eq("eventId", event._id).eq("status", "waitlisted"),
      )
      .collect(),
    event.imageStorageId ? ctx.storage.getUrl(event.imageStorageId) : null,
  ]);

  const registered = confirmed.reduce((total, registration) => total + registration.seatCount, 0);
  const waitlistSeats = waitlisted.reduce(
    (total, registration) => total + registration.seatCount,
    0,
  );
  const [registeredSms, waitlistedSms] = await Promise.all([
    countSmsHouseholds(ctx, confirmed),
    countSmsHouseholds(ctx, waitlisted),
  ]);

  return {
    ...event,
    imageUrl: imageUrl ?? "/images/forge-brotherhood.jpg",
    registered,
    waitlisted: waitlistSeats,
    registeredFamilies: confirmed.length,
    waitlistedFamilies: waitlisted.length,
    registeredSms,
    waitlistedSms,
    remaining: Math.max(0, event.capacity - registered),
  };
}

async function countSmsHouseholds(
  ctx: QueryCtx,
  registrations: Doc<"registrations">[],
) {
  const households = await Promise.all(
    registrations.map((registration) => ctx.db.get(registration.householdId)),
  );
  return households.filter((household) => Boolean(household?.smsOptInAt)).length;
}

function validateEvent(args: {
  slug: string;
  title: string;
  startsAt: number;
  endsAt: number;
  enrollmentOpensAt: number;
  registrationClosesAt: number;
  capacity: number;
  lowCapacityThreshold: number;
}) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args.slug)) {
    throw new ConvexError("Use lowercase letters, numbers, and hyphens for the URL slug.");
  }
  if (!args.title.trim()) {
    throw new ConvexError("Event title is required.");
  }
  if (args.endsAt <= args.startsAt) {
    throw new ConvexError("The event end time must be after its start time.");
  }
  if (args.enrollmentOpensAt >= args.registrationClosesAt) {
    throw new ConvexError("Enrollment must open before registration closes.");
  }
  if (args.registrationClosesAt > args.startsAt) {
    throw new ConvexError("Registration cannot close after the event begins.");
  }
  if (!Number.isInteger(args.capacity) || args.capacity < 1) {
    throw new ConvexError("Capacity must be at least one.");
  }
  if (
    !Number.isInteger(args.lowCapacityThreshold) ||
    args.lowCapacityThreshold < 1 ||
    args.lowCapacityThreshold > args.capacity
  ) {
    throw new ConvexError("The low-seat warning must be between one and capacity.");
  }
}

function cleanEventFields<T extends Record<string, unknown>>(args: T) {
  const {
    eventId: _eventId,
    slug,
    title,
    excerpt,
    description,
    locationName,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    startsAt,
    endsAt,
    enrollmentOpensAt,
    registrationClosesAt,
    capacity,
    lowCapacityThreshold,
    status,
  } = args;

  return {
    slug: String(slug).trim(),
    title: String(title).trim(),
    excerpt: String(excerpt).trim(),
    description: String(description).trim(),
    locationName: String(locationName).trim(),
    addressLine1: addressLine1 ? String(addressLine1).trim() : undefined,
    addressLine2: addressLine2 ? String(addressLine2).trim() : undefined,
    city: String(city).trim(),
    state: String(state).trim(),
    postalCode: String(postalCode).trim(),
    startsAt: Number(startsAt),
    endsAt: Number(endsAt),
    enrollmentOpensAt: Number(enrollmentOpensAt),
    registrationClosesAt: Number(registrationClosesAt),
    capacity: Number(capacity),
    lowCapacityThreshold: Number(lowCapacityThreshold),
    status: status as Doc<"events">["status"],
  };
}

async function writeAuditLog(
  ctx: MutationCtx,
  actor: { authUserId: string; email: string },
  action: string,
  entityId: Id<"events">,
  summary: string,
) {
  await ctx.db.insert("auditLogs", {
    actorAuthUserId: actor.authUserId,
    actorEmail: actor.email,
    action,
    entityType: "event",
    entityId,
    summary,
    createdAt: Date.now(),
  });
}
