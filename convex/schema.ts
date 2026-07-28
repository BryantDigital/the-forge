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
    generalEmailOptInAt: v.optional(v.number()),
    smsOptInAt: v.optional(v.number()),
    smsConsentVersion: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_normalized_email", ["normalizedEmail"])
    .index("by_auth_user", ["authUserId"]),

  householdMembers: defineTable({
    householdId: v.id("households"),
    normalizedEmail: v.string(),
    email: v.string(),
    displayName: v.string(),
    role: v.union(v.literal("primary"), v.literal("adult")),
    status: v.union(v.literal("invited"), v.literal("active")),
    authUserId: v.optional(v.string()),
    invitedByAuthUserId: v.optional(v.string()),
    invitedAt: v.optional(v.number()),
    joinedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_household", ["householdId"])
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
    offerTokenHash: v.optional(v.string()),
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
    .index("by_event_and_household", ["eventId", "householdId"])
    .index("by_household", ["householdId"])
    .index("by_management_token", ["managementTokenHash"])
    .index("by_offer_token", ["offerTokenHash"])
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
    .index("by_child", ["childId"])
    .index("by_event_and_status", ["eventId", "status"])
    .index("by_event_and_last_name", ["eventId", "lastName", "firstName"]),

  eventNotifications: defineTable({
    eventId: v.optional(v.id("events")),
    eventSlug: v.string(),
    kind: v.union(v.literal("registration_open"), v.literal("waitlist")),
    contactKey: v.string(),
    parentName: v.string(),
    normalizedEmail: v.optional(v.string()),
    email: v.optional(v.string()),
    mobilePhone: v.optional(v.string()),
    emailEnabled: v.boolean(),
    smsEnabled: v.boolean(),
    smsConsentVersion: v.optional(v.string()),
    smsConsentText: v.optional(v.string()),
    smsConsentAcceptedAt: v.optional(v.number()),
    emailNotifiedAt: v.optional(v.number()),
    smsNotifiedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_event_slug_and_contact", ["eventSlug", "kind", "contactKey"])
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
      v.literal("denied"),
      v.literal("pending"),
      v.literal("approved"),
      // Retained while any early prototype records are migrated.
      v.literal("reviewing"),
      v.literal("contacted"),
      v.literal("closed"),
    ),
    notificationSentAt: v.optional(v.number()),
    reviewedByAuthUserId: v.optional(v.string()),
    reviewedByEmail: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    denialReason: v.optional(v.string()),
    activeSignatureRequestId: v.optional(v.id("signatureRequests")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status_and_created", ["status", "createdAt"])
    .index("by_email", ["email"]),

  signatureRequests: defineTable({
    volunteerSubmissionId: v.id("volunteerSubmissions"),
    templateVersion: v.string(),
    documentTitle: v.string(),
    documentBody: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("signed"),
      v.literal("revoked"),
      v.literal("expired"),
    ),
    tokenHash: v.string(),
    signerName: v.string(),
    signerEmail: v.string(),
    emailSentAt: v.optional(v.number()),
    emailError: v.optional(v.string()),
    expiresAt: v.number(),
    viewedAt: v.optional(v.number()),
    electronicConsentText: v.string(),
    electronicConsentAcceptedAt: v.optional(v.number()),
    signatureText: v.optional(v.string()),
    signedAt: v.optional(v.number()),
    signedDocumentStorageId: v.optional(v.id("_storage")),
    documentSha256: v.optional(v.string()),
    signerIpAddress: v.optional(v.string()),
    signerUserAgent: v.optional(v.string()),
    createdByAuthUserId: v.string(),
    createdByEmail: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_volunteer", ["volunteerSubmissionId"])
    .index("by_status_and_expiration", ["status", "expiresAt"]),

  signatureEvents: defineTable({
    signatureRequestId: v.id("signatureRequests"),
    volunteerSubmissionId: v.id("volunteerSubmissions"),
    type: v.union(
      v.literal("created"),
      v.literal("email_sent"),
      v.literal("viewed"),
      v.literal("signed"),
      v.literal("revoked"),
    ),
    actorAuthUserId: v.optional(v.string()),
    actorEmail: v.optional(v.string()),
    summary: v.string(),
    createdAt: v.number(),
  })
    .index("by_request", ["signatureRequestId"])
    .index("by_volunteer", ["volunteerSubmissionId"]),

  volunteerMemberships: defineTable({
    volunteerSubmissionId: v.id("volunteerSubmissions"),
    normalizedEmail: v.string(),
    email: v.string(),
    authUserId: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("revoked")),
    grantedAt: v.number(),
    revokedAt: v.optional(v.number()),
    revokedByAuthUserId: v.optional(v.string()),
    revokedByEmail: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_submission", ["volunteerSubmissionId"])
    .index("by_normalized_email", ["normalizedEmail"])
    .index("by_auth_user", ["authUserId"]),

  volunteerEventCommitments: defineTable({
    eventId: v.id("events"),
    volunteerMembershipId: v.id("volunteerMemberships"),
    volunteerSubmissionId: v.id("volunteerSubmissions"),
    roles: v.array(v.string()),
    status: v.union(v.literal("committed"), v.literal("withdrawn")),
    committedAt: v.number(),
    withdrawnAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_event_and_status", ["eventId", "status"])
    .index("by_membership", ["volunteerMembershipId"])
    .index("by_member_and_event", ["volunteerMembershipId", "eventId"]),

  donations: defineTable({
    householdId: v.optional(v.id("households")),
    normalizedEmail: v.string(),
    donorFirstName: v.optional(v.string()),
    donorLastName: v.optional(v.string()),
    livemode: v.optional(v.boolean()),
    stripeCustomerId: v.string(),
    stripeCheckoutSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripeInvoiceId: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),
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
    .index("by_stripe_subscription", ["stripeSubscriptionId"])
    .index("by_checkout_session", ["stripeCheckoutSessionId"])
    .index("by_stripe_invoice", ["stripeInvoiceId"]),

  stripeCustomers: defineTable({
    stripeCustomerId: v.string(),
    livemode: v.optional(v.boolean()),
    householdId: v.optional(v.id("households")),
    normalizedEmail: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_normalized_email", ["normalizedEmail"])
    .index("by_household", ["householdId"]),

  stripeSubscriptions: defineTable({
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    livemode: v.optional(v.boolean()),
    householdId: v.optional(v.id("households")),
    normalizedEmail: v.string(),
    frequency: v.union(
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("annually"),
    ),
    amountInCents: v.number(),
    currency: v.string(),
    status: v.string(),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    cancelledAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_stripe_subscription", ["stripeSubscriptionId"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_household", ["householdId"])
    .index("by_normalized_email", ["normalizedEmail"]),

  stripeWebhookEvents: defineTable({
    stripeEventId: v.string(),
    type: v.string(),
    processedAt: v.number(),
  }).index("by_stripe_event", ["stripeEventId"]),

  communications: defineTable({
    eventId: v.optional(v.id("events")),
    householdId: v.optional(v.id("households")),
    registrationId: v.optional(v.id("registrations")),
    channel: v.union(v.literal("email"), v.literal("sms")),
    provider: v.union(v.literal("sendgrid"), v.literal("twilio")),
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
      v.literal("sending"),
      v.literal("sent"),
      v.literal("partially_failed"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    isTest: v.optional(v.boolean()),
    testRecipient: v.optional(v.string()),
    error: v.optional(v.string()),
    scheduledFor: v.number(),
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_status_and_schedule", ["status", "scheduledFor"])
    .index("by_event", ["eventId"])
    .index("by_registration", ["registrationId"]),

  communicationDeliveries: defineTable({
    communicationId: v.id("communications"),
    eventId: v.optional(v.id("events")),
    householdId: v.optional(v.id("households")),
    registrationId: v.optional(v.id("registrations")),
    channel: v.union(v.literal("email"), v.literal("sms")),
    recipient: v.string(),
    providerMessageId: v.optional(v.string()),
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed"),
      v.literal("undelivered"),
    ),
    error: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_communication", ["communicationId"])
    .index("by_provider_message", ["providerMessageId"])
    .index("by_recipient", ["recipient", "createdAt"]),

  smsSuppressions: defineTable({
    mobilePhone: v.string(),
    reason: v.union(
      v.literal("stop"),
      v.literal("carrier"),
      v.literal("admin"),
    ),
    source: v.union(
      v.literal("twilio_inbound"),
      v.literal("twilio_status"),
      v.literal("admin"),
    ),
    suppressedAt: v.number(),
    updatedAt: v.number(),
  }).index("by_mobile_phone", ["mobilePhone"]),

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
