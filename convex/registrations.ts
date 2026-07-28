import { ConvexError, v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent } from "./auth";

const WAIVER_VERSION = "forge-participation-v1";

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
        firstName: child.firstName,
        lastName: child.lastName,
        birthDate: child.birthDate,
        age: child.statedAge,
        allergies: child.allergies,
        notes: child.notes,
        status: child.status,
      })),
    };
  },
});

export const connectMyHousehold = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    const authUserId = user.userId ?? user._id;
    const household = await ctx.db
      .query("households")
      .withIndex("by_normalized_email", (range) =>
        range.eq("normalizedEmail", user.email.toLowerCase()),
      )
      .unique();

    if (!household) return { connected: false };
    if (household.authUserId !== authUserId) {
      await ctx.db.patch(household._id, {
        authUserId,
        updatedAt: Date.now(),
      });
    }
    return { connected: true, householdId: household._id };
  },
});

export const getMyAccount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await getHouseholdIdentity(ctx);
    if (!identity) return null;

    const [registrations, savedChildren] = await Promise.all([
      ctx.db
        .query("registrations")
        .withIndex("by_household", (range) =>
          range.eq("householdId", identity.household._id),
        )
        .collect(),
      ctx.db
        .query("children")
        .withIndex("by_household", (range) =>
          range.eq("householdId", identity.household._id),
        )
        .collect(),
    ]);

    const registrationRows = await Promise.all(
      registrations.map(async (registration) => {
        const [event, children] = await Promise.all([
          ctx.db.get(registration.eventId),
          ctx.db
            .query("registrationChildren")
            .withIndex("by_registration", (range) =>
              range.eq("registrationId", registration._id),
            )
            .collect(),
        ]);
        if (!event) return null;
        return {
          id: registration._id,
          status: registration.status,
          seatCount: registration.seatCount,
          waitlistPosition: registration.waitlistPosition,
          offerExpiresAt: registration.offerExpiresAt,
          event: {
            slug: event.slug,
            title: event.title,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            locationName: event.locationName,
            city: event.city,
            state: event.state,
          },
          isUpcoming: event.startsAt >= Date.now(),
          children: children.map((child) => ({
            id: child._id,
            name: `${child.firstName} ${child.lastName}`,
            status: child.status,
          })),
        };
      }),
    );

    return {
      household: {
        parentName: `${identity.household.parentFirstName} ${identity.household.parentLastName}`,
        parentFirstName: identity.household.parentFirstName,
        parentLastName: identity.household.parentLastName,
        email: identity.household.email,
        mobilePhone: identity.household.mobilePhone,
        emergencyContactName: identity.household.emergencyContactName,
        emergencyContactPhone: identity.household.emergencyContactPhone,
      },
      savedChildren: savedChildren
        .filter((child) => !child.archivedAt)
        .map((child) => ({
          id: child._id,
          name: `${child.firstName} ${child.lastName}`,
          firstName: child.firstName,
          lastName: child.lastName,
          birthDate: child.birthDate,
          age: child.statedAge,
          allergies: child.allergies,
          notes: child.notes,
        })),
      registrations: registrationRows
        .filter((row) => row !== null)
        .sort((a, b) => b.event.startsAt - a.event.startsAt),
    };
  },
});

export const getMyRegistration = query({
  args: { registrationId: v.id("registrations") },
  handler: async (ctx, args) => {
    const identity = await getHouseholdIdentity(ctx);
    if (!identity) return null;
    const registration = await ctx.db.get(args.registrationId);
    if (!registration || registration.householdId !== identity.household._id) {
      return null;
    }
    const [event, children] = await Promise.all([
      ctx.db.get(registration.eventId),
      ctx.db
        .query("registrationChildren")
        .withIndex("by_registration", (range) =>
          range.eq("registrationId", registration._id),
        )
        .collect(),
    ]);
    if (!event) return null;
    return {
      registrationId: registration._id,
      status: registration.status,
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
        parentName: `${identity.household.parentFirstName} ${identity.household.parentLastName}`,
        email: identity.household.email,
        mobilePhone: identity.household.mobilePhone,
      },
      children: children.map((child) => ({
        id: child._id,
        name: `${child.firstName} ${child.lastName}`,
        firstName: child.firstName,
        lastName: child.lastName,
        birthDate: child.birthDate,
        age: child.statedAge,
        allergies: child.allergies,
        notes: child.notes,
        status: child.status,
      })),
    };
  },
});

export const cancelMyChildren = mutation({
  args: {
    registrationId: v.id("registrations"),
    childIds: v.array(v.id("registrationChildren")),
  },
  handler: async (ctx, args) => {
    const identity = await getHouseholdIdentity(ctx);
    if (!identity) {
      throw new ConvexError("Sign in to manage this registration.");
    }
    const registration = await ctx.db.get(args.registrationId);
    if (!registration || registration.householdId !== identity.household._id) {
      throw new ConvexError("Registration not found.");
    }
    const result = await cancelRegistrationChildren(ctx, registration, args.childIds);
    await ctx.scheduler.runAfter(
      0,
      internal.registrations.sendAccountCancellationNotifications,
      {
        registrationId: registration._id,
        cancelledChildren: result.cancelledChildren,
      },
    );
    return result;
  },
});

export const addChildren = mutation({
  args: {
    managementTokenHash: v.string(),
    children: v.array(childInput),
    waiverAccepted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query("registrations")
      .withIndex("by_management_token", (range) =>
        range.eq("managementTokenHash", args.managementTokenHash),
      )
      .unique();
    if (!registration) throw new ConvexError("Registration not found.");
    return addChildrenToRegistration(
      ctx,
      registration,
      args.children,
      args.waiverAccepted,
    );
  },
});

export const addMyChildren = mutation({
  args: {
    registrationId: v.id("registrations"),
    children: v.array(childInput),
    waiverAccepted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await getHouseholdIdentity(ctx);
    if (!identity) throw new ConvexError("Sign in to manage this registration.");
    const registration = await ctx.db.get(args.registrationId);
    if (!registration || registration.householdId !== identity.household._id) {
      throw new ConvexError("Registration not found.");
    }
    return addChildrenToRegistration(
      ctx,
      registration,
      args.children,
      args.waiverAccepted,
    );
  },
});

export const updateChild = mutation({
  args: {
    managementTokenHash: v.string(),
    registrationChildId: v.id("registrationChildren"),
    child: childInput,
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query("registrations")
      .withIndex("by_management_token", (range) =>
        range.eq("managementTokenHash", args.managementTokenHash),
      )
      .unique();
    if (!registration) throw new ConvexError("Registration not found.");
    return updateRegistrationChild(
      ctx,
      registration,
      args.registrationChildId,
      args.child,
    );
  },
});

export const updateMyChild = mutation({
  args: {
    registrationId: v.id("registrations"),
    registrationChildId: v.id("registrationChildren"),
    child: childInput,
  },
  handler: async (ctx, args) => {
    const identity = await getHouseholdIdentity(ctx);
    if (!identity) throw new ConvexError("Sign in to manage this registration.");
    const registration = await ctx.db.get(args.registrationId);
    if (!registration || registration.householdId !== identity.household._id) {
      throw new ConvexError("Registration not found.");
    }
    return updateRegistrationChild(
      ctx,
      registration,
      args.registrationChildId,
      args.child,
    );
  },
});

export const claimMyOffer = mutation({
  args: { registrationId: v.id("registrations") },
  handler: async (ctx, args) => {
    const identity = await getHouseholdIdentity(ctx);
    if (!identity) {
      throw new ConvexError("Sign in to claim these seats.");
    }
    const registration = await ctx.db.get(args.registrationId);
    if (
      !registration ||
      registration.householdId !== identity.household._id ||
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
      summary: `Claimed a ${registration.seatCount}-seat waitlist offer from account`,
      createdAt: Date.now(),
    });
    return { registrationId: registration._id, status: "confirmed" as const };
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
    return cancelRegistrationChildren(ctx, registration, args.childIds);
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

export const sendAccountCancellationNotifications = internalAction({
  args: {
    registrationId: v.id("registrations"),
    cancelledChildren: v.number(),
  },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.registrations.getEmailContext, {
      registrationId: args.registrationId,
    });
    if (!context) return { sent: false };
    await deliverCancellationEmails(context, args.cancelledChildren);
    await ctx.runMutation(internal.communications.queueRegistrationSms, {
      registrationId: context.registration._id,
      kind: "cancellation",
      body: `${args.cancelledChildren} child${args.cancelledChildren === 1 ? " was" : "ren were"} cancelled from ${context.event.title}. Any released seats have been returned.`,
    });
    return { sent: true };
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
        ? `Confirmed: ${context.event.title}`
        : `Waitlist confirmed: ${context.event.title}`,
      text: confirmed
        ? `You're in. Your ${context.registration.seatCount}-seat registration for ${context.event.title} is confirmed. Manage or cancel your registration: ${manageUrl}`
        : `Your family is on the waitlist for ${context.registration.seatCount} seats at ${context.event.title}. We will contact you if enough seats open for your entire request. Manage your registration: ${manageUrl}`,
      html: emailFrame(
        confirmed ? "You’re in." : "You’re on the list.",
        `<p style="margin:0 0 18px">Hi ${escapeHtml(context.household.parentFirstName)},</p>
         <p style="margin:0 0 22px">Your family has <strong>${context.registration.seatCount} ${confirmed ? "confirmed" : "waitlisted"} seat${context.registration.seatCount === 1 ? "" : "s"}</strong> for ${escapeHtml(context.event.title)}.</p>
         ${eventDetailsEmail(context.event)}
         <p style="margin:22px 0">${confirmed ? "We’ll send the practical details again before the event." : "When enough seats open for your entire request, you’ll receive a 24-hour offer. We never split a family request."}</p>
         <p style="margin:0"><a href="${manageUrl}" style="${buttonStyle}">Manage reservation&nbsp; →</a></p>`,
        confirmed ? "Registration confirmed" : "Waitlist confirmed",
      ),
    });
    await ctx.runMutation(internal.communications.queueRegistrationSms, {
      registrationId: context.registration._id,
      kind: "confirmation",
      body: confirmed
        ? `You're confirmed for ${context.event.title}. ${context.registration.seatCount} seat${context.registration.seatCount === 1 ? "" : "s"} reserved. Manage your reservation: ${manageUrl}`
        : `You're on the waitlist for ${context.event.title}. We’ll text and email if your entire ${context.registration.seatCount}-seat request can be offered. Manage: ${manageUrl}`,
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
    await deliverCancellationEmails(context, args.cancelledChildren);
    await ctx.runMutation(internal.communications.queueRegistrationSms, {
      registrationId: context.registration._id,
      kind: "cancellation",
      body: `${args.cancelledChildren} child${args.cancelledChildren === 1 ? " was" : "ren were"} cancelled from ${context.event.title}. Any released seats have been returned.`,
    });
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
      registrationId: firstFit._id,
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
      subject: `Action required: your Forge seats are ready`,
      text: `Enough seats opened for your entire family request for ${result.eventTitle}. Claim them within 24 hours: ${claimUrl}`,
      html: emailFrame(
        "Your seats are ready.",
        `<p style="margin:0 0 18px">Hi ${escapeHtml(result.parentFirstName)},</p>
         <p style="margin:0 0 20px">Enough room opened for your entire <strong>${result.seatCount}-seat</strong> request for ${escapeHtml(result.eventTitle)}.</p>
         <div style="margin:22px 0;padding:18px;border-left:4px solid #b81921;background:#f4eee5">
           <strong style="display:block;color:#111;text-transform:uppercase;letter-spacing:.08em">Held for 24 hours</strong>
           <span style="display:block;margin-top:6px;color:#5d5851">Claim the complete reservation before this offer moves to the next family.</span>
         </div>
         <p style="margin:0"><a href="${claimUrl}" style="${buttonStyle}">Claim all seats&nbsp; →</a></p>`,
        "Waitlist opening",
      ),
    });
    await ctx.runMutation(internal.communications.queueRegistrationSms, {
      registrationId: result.registrationId,
      kind: "waitlist_offer",
      body: `Your seats are ready for ${result.eventTitle}. Claim the complete ${result.seatCount}-seat request within 24 hours: ${claimUrl}`,
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

async function getHouseholdIdentity(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) return null;
  const authUserId = user.userId ?? user._id;
  const byAuthUser = await ctx.db
    .query("households")
    .withIndex("by_auth_user", (range) => range.eq("authUserId", authUserId))
    .unique();
  if (byAuthUser) return { user, household: byAuthUser };

  const byEmail = await ctx.db
    .query("households")
    .withIndex("by_normalized_email", (range) =>
      range.eq("normalizedEmail", user.email.toLowerCase()),
    )
    .unique();
  return byEmail ? { user, household: byEmail } : null;
}

async function addChildrenToRegistration(
  ctx: MutationCtx,
  registration: Doc<"registrations">,
  childInputs: Array<{
    firstName: string;
    lastName: string;
    birthDate: string;
    statedAge: number;
    allergies?: string;
    notes?: string;
  }>,
  waiverAccepted: boolean,
) {
  if (!waiverAccepted) {
    throw new ConvexError("Agree to the participation waiver for the added children.");
  }
  if (registration.status === "cancelled") {
    throw new ConvexError("This registration is no longer active.");
  }
  if (childInputs.length < 1 || childInputs.length > 10) {
    throw new ConvexError("Add between one and 10 children.");
  }
  const event = await ctx.db.get(registration.eventId);
  if (!event || event.status !== "published" || Date.now() >= event.registrationClosesAt) {
    throw new ConvexError("Registration changes are closed for this event.");
  }
  const existingRegistrationChildren = await ctx.db
    .query("registrationChildren")
    .withIndex("by_registration", (range) =>
      range.eq("registrationId", registration._id),
    )
    .collect();
  const activeCount = existingRegistrationChildren.filter(
    (child) => child.status === "active",
  ).length;
  if (activeCount + childInputs.length > 10) {
    throw new ConvexError("A registration can include up to 10 active children.");
  }
  if (activeCount + childInputs.length > event.capacity) {
    throw new ConvexError("This family request is larger than the event capacity.");
  }
  if (registration.status === "confirmed" || registration.status === "offered") {
    const capacity = await capacitySnapshot(ctx, event._id);
    if (childInputs.length > capacity.remaining) {
      throw new ConvexError(
        `Only ${capacity.remaining} additional ${capacity.remaining === 1 ? "spot is" : "spots are"} available.`,
      );
    }
  }

  const children = childInputs.map(validateChildData);
  const savedChildren = await ctx.db
    .query("children")
    .withIndex("by_household", (range) =>
      range.eq("householdId", registration.householdId),
    )
    .collect();
  const now = Date.now();
  const addedIds: Id<"registrationChildren">[] = [];
  for (const child of children) {
    const existing = savedChildren.find(
      (candidate) =>
        candidate.firstName.toLowerCase() === child.firstName.toLowerCase() &&
        candidate.lastName.toLowerCase() === child.lastName.toLowerCase() &&
        candidate.birthDate === child.birthDate,
    );
    let childId: Id<"children">;
    if (existing) {
      childId = existing._id;
      await ctx.db.patch(childId, {
        ...child,
        archivedAt: undefined,
        updatedAt: now,
      });
    } else {
      childId = await ctx.db.insert("children", {
        householdId: registration.householdId,
        ...child,
        createdAt: now,
        updatedAt: now,
      });
    }
    addedIds.push(
      await ctx.db.insert("registrationChildren", {
        registrationId: registration._id,
        eventId: registration.eventId,
        childId,
        ...child,
        status: "active",
        createdAt: now,
        updatedAt: now,
      }),
    );
  }
  const newSeatCount = activeCount + children.length;
  await ctx.db.patch(registration._id, {
    seatCount: newSeatCount,
    waiverVersion: WAIVER_VERSION,
    waiverAcceptedAt: now,
    updatedAt: now,
  });
  await ctx.db.insert("auditLogs", {
    action: "registration.children_added",
    entityType: "registration",
    entityId: registration._id,
    summary: `Added ${children.length} child${children.length === 1 ? "" : "ren"} to a registration`,
    createdAt: now,
  });
  if (registration.status === "waitlisted") {
    await ctx.scheduler.runAfter(0, internal.registrations.processWaitlist, {
      eventId: registration.eventId,
    });
  }
  return {
    registrationId: registration._id,
    addedChildren: children.length,
    childIds: addedIds,
    seatCount: newSeatCount,
    status: registration.status,
  };
}

async function updateRegistrationChild(
  ctx: MutationCtx,
  registration: Doc<"registrations">,
  registrationChildId: Id<"registrationChildren">,
  childInputValue: {
    firstName: string;
    lastName: string;
    birthDate: string;
    statedAge: number;
    allergies?: string;
    notes?: string;
  },
) {
  if (registration.status === "cancelled") {
    throw new ConvexError("This registration is no longer active.");
  }
  const event = await ctx.db.get(registration.eventId);
  if (!event || Date.now() >= event.registrationClosesAt) {
    throw new ConvexError("Registration changes are closed for this event.");
  }
  const registrationChild = await ctx.db.get(registrationChildId);
  if (
    !registrationChild ||
    registrationChild.registrationId !== registration._id ||
    registrationChild.status !== "active"
  ) {
    throw new ConvexError("Participant not found.");
  }
  const child = validateChildData(childInputValue);
  const now = Date.now();
  await ctx.db.patch(registrationChild._id, {
    ...child,
    updatedAt: now,
  });
  if (registrationChild.childId) {
    await ctx.db.patch(registrationChild.childId, {
      ...child,
      updatedAt: now,
    });
  }
  await ctx.db.insert("auditLogs", {
    action: "registration.child_updated",
    entityType: "registrationChild",
    entityId: registrationChild._id,
    summary: `Updated participant ${child.firstName} ${child.lastName}`,
    createdAt: now,
  });
  return {
    registrationChildId: registrationChild._id,
    child,
  };
}

function validateChildData(child: {
  firstName: string;
  lastName: string;
  birthDate: string;
  statedAge: number;
  allergies?: string;
  notes?: string;
}) {
  const firstName = child.firstName.trim().slice(0, 100);
  const lastName = child.lastName.trim().slice(0, 100);
  const birthDate = child.birthDate.trim();
  const statedAge = Number(child.statedAge);
  if (!firstName || !lastName) {
    throw new ConvexError("Enter the child’s first and last name.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(birthDate))) {
    throw new ConvexError(`Enter a valid birth date for ${firstName}.`);
  }
  if (!Number.isInteger(statedAge) || statedAge < 1 || statedAge > 21) {
    throw new ConvexError(`Enter a valid age for ${firstName}.`);
  }
  return {
    firstName,
    lastName,
    birthDate,
    statedAge,
    allergies: child.allergies?.trim().slice(0, 500) || undefined,
    notes: child.notes?.trim().slice(0, 500) || undefined,
  };
}

async function cancelRegistrationChildren(
  ctx: MutationCtx,
  registration: Doc<"registrations">,
  childIds: Id<"registrationChildren">[],
) {
  if (registration.status === "cancelled") {
    throw new ConvexError("This registration is no longer active.");
  }
  const children = await ctx.db
    .query("registrationChildren")
    .withIndex("by_registration", (range) =>
      range.eq("registrationId", registration._id),
    )
    .collect();
  const requestedIds = new Set(childIds);
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
  "display:inline-block;background:#b81921;color:#ffffff;padding:15px 22px;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase";

type RegistrationEmailContext = {
  registration: Doc<"registrations">;
  event: Doc<"events">;
  household: Doc<"households">;
};

async function deliverCancellationEmails(
  context: RegistrationEmailContext,
  cancelledChildren: number,
) {
  const detail = `${cancelledChildren} child${cancelledChildren === 1 ? "" : "ren"} cancelled from ${context.event.title}`;
  const accountUrl = `${requiredEnv("SITE_URL").replace(/\/$/, "")}/account`;
  await sendEmail({
    to: context.household.email,
    subject: `Reservation updated: ${context.event.title}`,
    text: `${detail}. Any released seats have been returned to the event. Review your reservations: ${accountUrl}`,
    html: emailFrame(
      "Reservation updated.",
      `<p style="margin:0 0 18px">Hi ${escapeHtml(context.household.parentFirstName)},</p>
       <p style="margin:0 0 22px"><strong>${escapeHtml(detail)}.</strong> Any released seats have been returned to the event.</p>
       ${eventDetailsEmail(context.event)}
       <p style="margin:22px 0 0"><a href="${accountUrl}" style="${buttonStyle}">Open family account&nbsp; →</a></p>`,
      "Registration change",
    ),
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
      html: emailFrame(
        "A family updated their reservation.",
        `<p style="margin:0 0 18px"><strong>${escapeHtml(context.household.parentFirstName)} ${escapeHtml(context.household.parentLastName)}</strong></p>
         <p style="margin:0">${escapeHtml(detail)}. Any released capacity is already available to the next family.</p>`,
        "Admin notification",
      ),
    });
  }
}

function eventDetailsEmail(event: Doc<"events">) {
  const location = [
    event.locationName,
    event.addressLine1,
    `${event.city}, ${event.state} ${event.postalCode}`,
  ].filter(Boolean).join(" · ");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;border-collapse:collapse;background:#f4eee5;border:1px solid #ddd3c5">
    <tr>
      <td style="padding:15px 17px;border-bottom:1px solid #ddd3c5;color:#766e64;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">Event</td>
      <td style="padding:15px 17px;border-bottom:1px solid #ddd3c5;color:#111;font-size:14px;font-weight:700;text-align:right">${escapeHtml(event.title)}</td>
    </tr>
    <tr>
      <td style="padding:15px 17px;border-bottom:1px solid #ddd3c5;color:#766e64;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">When</td>
      <td style="padding:15px 17px;border-bottom:1px solid #ddd3c5;color:#111;font-size:14px;font-weight:700;text-align:right">${escapeHtml(formatEventEmailDate(event.startsAt))}</td>
    </tr>
    <tr>
      <td style="padding:15px 17px;color:#766e64;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">Where</td>
      <td style="padding:15px 17px;color:#111;font-size:14px;font-weight:700;text-align:right">${escapeHtml(location)}</td>
    </tr>
  </table>`;
}

function formatEventEmailDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(timestamp);
}

function emailFrame(title: string, body: string, eyebrow = "The Forge") {
  const siteUrl = (process.env.SITE_URL ?? "https://forgeva.com").replace(/\/$/, "");
  const logoUrl = `${siteUrl}/images/forge-logo-white.png`;
  return `<!doctype html>
  <html lang="en">
    <body style="margin:0;padding:0;background:#0a0a0b">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#0a0a0b">
        <tr><td height="6" style="height:6px;background:#b81921"></td></tr>
        <tr>
          <td style="padding:34px 16px 42px">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:0 auto;border-collapse:collapse">
              <tr>
                <td style="padding:0 4px 26px">
                  <a href="${siteUrl}" style="text-decoration:none">
                    <img src="${logoUrl}" width="220" alt="The Forge" style="display:block;width:220px;max-width:70%;height:auto;border:0">
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:38px 38px 40px;background:#f8f4ed;color:#171616;font-family:Arial,Helvetica,sans-serif">
                  <p style="margin:0 0 12px;color:#b81921;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase">${escapeHtml(eyebrow)}</p>
                  <h1 style="margin:0 0 22px;color:#0d0d0e;font-family:Impact,'Arial Narrow',Arial,sans-serif;font-size:38px;line-height:1.02;font-weight:800;letter-spacing:.01em;text-transform:uppercase">${escapeHtml(title)}</h1>
                  <div style="color:#4d4944;font-size:16px;line-height:1.65">${body}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 4px 0;color:#908d87;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6">
                  <strong style="color:#ffffff;letter-spacing:.08em;text-transform:uppercase">Faith · Fitness · Fellowship · Fun</strong><br>
                  The Forge Christian Ministries · Virginia Beach, Virginia<br>
                  Questions? Reply to this email and our team will help.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
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
