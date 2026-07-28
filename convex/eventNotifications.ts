import { mutationGeneric } from "convex/server";
import { v } from "convex/values";

export const subscribe = mutationGeneric({
  args: {
    eventSlug: v.string(),
    kind: v.union(v.literal("registration_open"), v.literal("waitlist")),
    parentName: v.string(),
    emailEnabled: v.boolean(),
    smsEnabled: v.boolean(),
    email: v.optional(v.string()),
    normalizedEmail: v.optional(v.string()),
    mobilePhone: v.optional(v.string()),
    smsConsentVersion: v.optional(v.string()),
    smsConsentText: v.optional(v.string()),
    smsConsentAcceptedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const contactKey = args.normalizedEmail ?? args.mobilePhone;
    if (!contactKey) {
      throw new Error("A notification contact is required.");
    }

    const existing = await ctx.db
      .query("eventNotifications")
      .filter((query) =>
        query.and(
          query.eq(query.field("eventSlug"), args.eventSlug),
          query.eq(query.field("kind"), args.kind),
          query.eq(query.field("contactKey"), contactKey),
        ),
      )
      .first();

    const subscription = {
      eventSlug: args.eventSlug,
      kind: args.kind,
      contactKey,
      parentName: args.parentName,
      emailEnabled: args.emailEnabled,
      smsEnabled: args.smsEnabled,
      email: args.email,
      normalizedEmail: args.normalizedEmail,
      mobilePhone: args.mobilePhone,
      smsConsentVersion: args.smsConsentVersion,
      smsConsentText: args.smsConsentText,
      smsConsentAcceptedAt: args.smsConsentAcceptedAt,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, subscription);
      return { id: existing._id, created: false };
    }

    const id = await ctx.db.insert("eventNotifications", {
      ...subscription,
      createdAt: Date.now(),
    });

    return { id, created: true };
  },
});
