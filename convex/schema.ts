import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const adminRole = v.union(
  v.literal("owner"),
  v.literal("event_manager"),
  v.literal("checkin"),
);

const eventStatus = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("cancelled"),
  v.literal("completed"),
);

const registrationStatus = v.union(
  v.literal("confirmed"),
  v.literal("waitlisted"),
  v.literal("offered"),
  v.literal("cancelled"),
);

export default defineSchema({
  households: defineTable({
    normalizedEmail: v.string(),
    email: v.string(),
    parentFirstName: v.string(),
    parentLastName: v.string(),
    mobilePhone: v.string(),
    emergencyContactName: v.string(),
    emergencyContactPhone: v.string(),
    authUserId: v.optional(v.string()),
    mailchimpContactId: v.optional(v.string()),
    generalEmailOptInAt: v.optional(v.number()),
    smsOptInAt: v.optional(v.number()),
    smsConsentVersion: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_normalized_email", ["normalizedEmail"])
    .index("by_auth_user", ["authUserId"]),

  children: defineTable({
    householdId: v.id("households"),
    firstName: v.string(),
    lastName: v.string(),
    birthDate: v.string(),
    statedAge: v.number(),
    allergies: v.optional(v.string()),
    notes: v.optional(v.string()),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_household", ["householdId"]),

  events: defineTable({
    slug: v.string(),
    title: v.string(),
    excerpt: v.string(),
    description: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    locationName: v.string(),
    addressLine1: v.optional(v.string()),
    addressLine2: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    postalCode: v.string(),
    timezone: v.literal("America/New_York"),
    startsAt: v.number(),
    endsAt: v.number(),
    enrollmentOpensAt: v.number(),
    registrationClosesAt: v.number(),
    capacity: v.number(),
    lowCapacityThreshold: v.number(),
    status: eventStatus,
    createdByAuthUserId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status_and_start", ["status", "startsAt"])
    .index("by_start", ["startsAt"]),

  registrations: defineTable({
    eventId: v.id("events"),
    householdId: v.id("households"),
    status: registrationStatus,
    seatCount: v.number(),
    waitlistPosition: v.optional(v.number()),
    offeredAt: v.optional(v.number()),
    offerExpiresAt: v.optional(v.number()),
    managementTokenHash: v.string(),
    waiverVersion: v.string(),
    waiverAcceptedAt: v.number(),
    emailNotificationsEnabled: v.boolean(),
    smsNotificationsEnabled: v.boolean(),
    smsConsentVersion: v.optional(v.string()),
    smsConsentAcceptedAt: v.optional(v.number()),
    confirmationSentAt: v.optional(v.number()),
    reminderWeekSentAt: v.optional(v.number()),
    reminderDayOfSentAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_event_and_status", ["eventId", "status"])
    .index("by_household", ["householdId"])
    .index("by_offer_expiration", ["status", "offerExpiresAt"]),

  registrationChildren: defineTable({
    registrationId: v.id("registrations"),
    eventId: v.id("events"),
    childId: v.optional(v.id("children")),
    firstName: v.string(),
    lastName: v.string(),
    birthDate: v.string(),
    statedAge: v.number(),
    allergies: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("cancelled")),
    checkedInAt: v.optional(v.number()),
    checkedInByAuthUserId: v.optional(v.string()),
    cancelledAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_registration", ["registrationId"])
    .index("by_event_and_status", ["eventId", "status"])
    .index("by_event_and_last_name", ["eventId", "lastName", "firstName"]),

  eventNotifications: defineTable({
    eventId: v.id("events"),
    kind: v.union(v.literal("registration_open"), v.literal("waitlist")),
    parentName: v.string(),
    normalizedEmail: v.string(),
    email: v.string(),
    mobilePhone: v.string(),
    emailEnabled: v.boolean(),
    smsEnabled: v.boolean(),
    smsConsentVersion: v.optional(v.string()),
    smsConsentAcceptedAt: v.optional(v.number()),
    emailNotifiedAt: v.optional(v.number()),
    smsNotifiedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_event_and_email", ["eventId", "normalizedEmail"])
    .index("by_event_and_kind", ["eventId", "kind"]),

  adminMemberships: defineTable({
    authUserId: v.string(),
    email: v.string(),
    role: adminRole,
    invitedByAuthUserId: v.optional(v.string()),
    disabledAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth_user", ["authUserId"])
    .index("by_email", ["email"]),

  volunteerSubmissions: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    mobilePhone: v.string(),
    backgroundCheckAccepted: v.boolean(),
    roleInterests: v.array(v.string()),
    statementOfFaithAccepted: v.boolean(),
    faithResponse: v.string(),
    status: v.union(
      v.literal("new"),
      v.literal("reviewing"),
      v.literal("contacted"),
      v.literal("closed"),
    ),
    notificationSentAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status_and_created", ["status", "createdAt"]),

  donations: defineTable({
    householdId: v.optional(v.id("households")),
    normalizedEmail: v.string(),
    stripeCustomerId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    amountInCents: v.number(),
    currency: v.string(),
    frequency: v.union(
      v.literal("one_time"),
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("annually"),
    ),
    status: v.string(),
    occurredAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_normalized_email", ["normalizedEmail"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"]),

  communications: defineTable({
    eventId: v.optional(v.id("events")),
    householdId: v.optional(v.id("households")),
    registrationId: v.optional(v.id("registrations")),
    channel: v.union(v.literal("email"), v.literal("sms")),
    provider: v.union(v.literal("mailchimp"), v.literal("twilio")),
    kind: v.union(
      v.literal("confirmation"),
      v.literal("week_reminder"),
      v.literal("day_of_reminder"),
      v.literal("waitlist_offer"),
      v.literal("cancellation"),
      v.literal("admin_broadcast"),
      v.literal("volunteer_notification"),
    ),
    providerMessageId: v.optional(v.string()),
    audience: v.optional(
      v.union(
        v.literal("registered"),
        v.literal("waitlisted"),
        v.literal("all_event_families"),
      ),
    ),
    subject: v.optional(v.string()),
    body: v.string(),
    recipientCount: v.optional(v.number()),
    createdByAuthUserId: v.optional(v.string()),
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    error: v.optional(v.string()),
    scheduledFor: v.number(),
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_status_and_schedule", ["status", "scheduledFor"])
    .index("by_event", ["eventId"])
    .index("by_registration", ["registrationId"]),

  auditLogs: defineTable({
    actorAuthUserId: v.optional(v.string()),
    actorEmail: v.optional(v.string()),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    summary: v.string(),
    createdAt: v.number(),
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_created", ["createdAt"]),
});
