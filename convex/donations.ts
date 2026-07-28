import { ConvexError, v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent } from "./auth";

const frequencyValidator = v.union(
  v.literal("one_time"),
  v.literal("monthly"),
  v.literal("quarterly"),
  v.literal("annually"),
);

type Frequency = "one_time" | "monthly" | "quarterly" | "annually";

export const createCheckoutSession = action({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    amountInCents: v.number(),
    frequency: frequencyValidator,
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const input = validateDonation(args);
    const livemode = stripeLiveMode();
    const existingCustomer = await ctx.runQuery(
      internal.donations.findStripeCustomer,
      { normalizedEmail: input.normalizedEmail, livemode },
    );
    const siteUrl = publicSiteUrl();
    const recurring = recurringInterval(input.frequency);
    const params = new URLSearchParams({
      mode: input.frequency === "one_time" ? "payment" : "subscription",
      success_url: `${siteUrl}/donate?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/donate?cancelled=true`,
      "payment_method_types[0]": "card",
      "payment_method_types[1]": "us_bank_account",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(input.amountInCents),
      "line_items[0][price_data][product_data][name]": "Donation to The Forge",
      "line_items[0][price_data][product_data][description]":
        input.frequency === "one_time"
          ? "One-time charitable gift"
          : `${frequencyLabel(input.frequency)} charitable gift`,
      "metadata[frequency]": input.frequency,
      "metadata[firstName]": input.firstName,
      "metadata[lastName]": input.lastName,
      "metadata[normalizedEmail]": input.normalizedEmail,
      "metadata[amountInCents]": String(input.amountInCents),
      "custom_text[submit][message]":
        "Thank you for helping forge boys into faithful men.",
    });

    if (existingCustomer) {
      params.set("customer", existingCustomer.stripeCustomerId);
    } else {
      params.set("customer_email", input.email);
      if (input.frequency === "one_time") {
        params.set("customer_creation", "always");
      }
    }

    if (recurring) {
      params.set("line_items[0][price_data][recurring][interval]", recurring.interval);
      params.set(
        "line_items[0][price_data][recurring][interval_count]",
        String(recurring.intervalCount),
      );
      params.set("subscription_data[metadata][frequency]", input.frequency);
      params.set("subscription_data[metadata][firstName]", input.firstName);
      params.set("subscription_data[metadata][lastName]", input.lastName);
      params.set(
        "subscription_data[metadata][normalizedEmail]",
        input.normalizedEmail,
      );
      params.set(
        "subscription_data[metadata][amountInCents]",
        String(input.amountInCents),
      );
    } else {
      params.set("payment_intent_data[metadata][frequency]", input.frequency);
      params.set("payment_intent_data[metadata][firstName]", input.firstName);
      params.set("payment_intent_data[metadata][lastName]", input.lastName);
      params.set(
        "payment_intent_data[metadata][normalizedEmail]",
        input.normalizedEmail,
      );
    }

    const session = await stripeRequest<{ url?: string }>(
      "/v1/checkout/sessions",
      params,
    );
    if (!session.url) {
      throw new ConvexError("Stripe did not return a secure checkout link.");
    }
    return { url: session.url };
  },
});

export const createMyPortalSession = action({
  args: {},
  handler: async (ctx): Promise<{ url: string }> => {
    const customer = await ctx.runQuery(
      internal.donations.getMyPortalCustomer,
      {},
    );
    if (!customer) {
      throw new ConvexError("No Stripe giving account is connected to this email yet.");
    }
    const params = new URLSearchParams({
      customer: customer.stripeCustomerId,
      return_url: `${publicSiteUrl()}/account`,
    });
    const session = await stripeRequest<{ url?: string }>(
      "/v1/billing_portal/sessions",
      params,
    );
    if (!session.url) {
      throw new ConvexError("Stripe billing management is temporarily unavailable.");
    }
    return { url: session.url };
  },
});

export const getMyGiving = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?.email) return null;
    const normalizedEmail = user.email.toLowerCase();
    const member = await ctx.db
      .query("householdMembers")
      .withIndex("by_normalized_email", (range) =>
        range.eq("normalizedEmail", normalizedEmail),
      )
      .first();
    const household =
      member
        ? await ctx.db.get(member.householdId)
        : await ctx.db
            .query("households")
            .withIndex("by_normalized_email", (range) =>
              range.eq("normalizedEmail", normalizedEmail),
            )
            .first();
    const householdId = household?._id;
    const livemode = stripeLiveMode();
    const [customers, donations, subscriptions] = await Promise.all([
      householdId
        ? ctx.db
            .query("stripeCustomers")
            .withIndex("by_household", (range) =>
              range.eq("householdId", householdId),
            )
            .collect()
        : ctx.db
            .query("stripeCustomers")
            .withIndex("by_normalized_email", (range) =>
              range.eq("normalizedEmail", normalizedEmail),
            )
            .collect(),
      householdId
        ? ctx.db
            .query("donations")
            .withIndex("by_household", (range) =>
              range.eq("householdId", householdId),
            )
            .collect()
        : ctx.db
            .query("donations")
            .withIndex("by_normalized_email", (range) =>
              range.eq("normalizedEmail", normalizedEmail),
            )
            .collect(),
      householdId
        ? ctx.db
            .query("stripeSubscriptions")
            .withIndex("by_household", (range) =>
              range.eq("householdId", householdId),
            )
            .collect()
        : ctx.db
            .query("stripeSubscriptions")
            .withIndex("by_normalized_email", (range) =>
              range.eq("normalizedEmail", normalizedEmail),
            )
            .collect(),
    ]);
    const customer = customers.find(
      (item) => Boolean(item.livemode) === livemode,
    );
    return {
      hasStripeCustomer: Boolean(customer),
      donations: donations
        .filter(
          (donation) =>
            donation.status === "paid" &&
            Boolean(donation.livemode) === livemode,
        )
        .sort((a, b) => b.occurredAt - a.occurredAt)
        .map((donation) => ({
          id: donation._id,
          amountInCents: donation.amountInCents,
          currency: donation.currency,
          frequency: donation.frequency,
          occurredAt: donation.occurredAt,
          receiptUrl: donation.receiptUrl,
        })),
      subscriptions: subscriptions
        .filter(
          (subscription) =>
            Boolean(subscription.livemode) === livemode,
        )
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((subscription) => ({
          id: subscription._id,
          amountInCents: subscription.amountInCents,
          currency: subscription.currency,
          frequency: subscription.frequency,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        })),
    };
  },
});

export const findStripeCustomer = internalQuery({
  args: { normalizedEmail: v.string(), livemode: v.boolean() },
  handler: async (ctx, args) => {
    const customers = await ctx.db
      .query("stripeCustomers")
      .withIndex("by_normalized_email", (range) =>
        range.eq("normalizedEmail", args.normalizedEmail),
      )
      .collect();
    return customers.find(
      (customer) => Boolean(customer.livemode) === args.livemode,
    );
  },
});

export const getMyPortalCustomer = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?.email) return null;
    const customers = await ctx.db
      .query("stripeCustomers")
      .withIndex("by_normalized_email", (range) =>
        range.eq("normalizedEmail", user.email.toLowerCase()),
      )
      .collect();
    const livemode = stripeLiveMode();
    return customers.find(
      (customer) => Boolean(customer.livemode) === livemode,
    );
  },
});

export const processStripeWebhook = internalMutation({
  args: { event: v.any() },
  handler: async (ctx, args) => {
    const event = args.event as StripeEvent;
    const existingEvent = await ctx.db
      .query("stripeWebhookEvents")
      .withIndex("by_stripe_event", (range) =>
        range.eq("stripeEventId", event.id),
      )
      .unique();
    if (existingEvent) return { duplicate: true };

    const object = event.data?.object ?? {};
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await processCheckoutSession(
        ctx,
        object as StripeCheckoutSession,
        event.created,
        Boolean(event.livemode),
      );
    } else if (event.type === "invoice.paid") {
      await processPaidInvoice(
        ctx,
        object as StripeInvoice,
        event.created,
        Boolean(event.livemode),
      );
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await processSubscription(
        ctx,
        object as StripeSubscription,
        event.created,
        Boolean(event.livemode),
      );
    }

    await ctx.db.insert("stripeWebhookEvents", {
      stripeEventId: event.id,
      type: event.type,
      processedAt: Date.now(),
    });
    return { duplicate: false };
  },
});

async function processCheckoutSession(
  ctx: MutationCtx,
  session: StripeCheckoutSession,
  eventCreated: number,
  livemode: boolean,
) {
  const customerId = stripeId(session.customer);
  const email = cleanEmail(
    session.customer_details?.email ??
      session.customer_email ??
      session.metadata?.normalizedEmail,
  );
  if (!customerId || !email) return;
  const firstName = cleanName(session.metadata?.firstName) || firstNameFromFullName(session.customer_details?.name);
  const lastName = cleanName(session.metadata?.lastName) || lastNameFromFullName(session.customer_details?.name);
  const householdId = await householdIdForEmail(ctx, email);
  await upsertStripeCustomer(ctx, {
    stripeCustomerId: customerId,
    email,
    firstName,
    lastName,
    householdId,
    livemode,
  });

  const frequency = parseFrequency(session.metadata?.frequency);
  const subscriptionId = stripeId(session.subscription);
  if (subscriptionId && frequency !== "one_time") {
    await upsertSubscription(ctx, {
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId,
      normalizedEmail: email,
      householdId,
      frequency,
      amountInCents: numberValue(session.amount_total ?? session.metadata?.amountInCents),
      currency: String(session.currency ?? "usd").toLowerCase(),
      status: "active",
      livemode,
    });
    return;
  }

  if (frequency === "one_time" && session.payment_status === "paid") {
    await recordDonation(ctx, {
      householdId,
      normalizedEmail: email,
      donorFirstName: firstName,
      donorLastName: lastName,
      stripeCustomerId: customerId,
      stripeCheckoutSessionId: String(session.id),
      stripePaymentIntentId: stripeId(session.payment_intent),
      amountInCents: numberValue(session.amount_total),
      currency: String(session.currency ?? "usd").toLowerCase(),
      frequency,
      status: "paid",
      occurredAt: eventCreated * 1000,
      livemode,
    });
  }
}

async function processPaidInvoice(
  ctx: MutationCtx,
  invoice: StripeInvoice,
  eventCreated: number,
  livemode: boolean,
) {
  const customerId = stripeId(invoice.customer);
  const subscriptionId =
    stripeId(invoice.subscription) ??
    stripeId(invoice.parent?.subscription_details?.subscription);
  if (!customerId || !subscriptionId) return;
  const storedSubscription = await ctx.db
    .query("stripeSubscriptions")
    .withIndex("by_stripe_subscription", (range) =>
      range.eq("stripeSubscriptionId", subscriptionId),
    )
    .unique();
  const metadata =
    invoice.parent?.subscription_details?.metadata ??
    invoice.lines?.data?.[0]?.metadata ??
    {};
  const email = cleanEmail(
    invoice.customer_email ??
      storedSubscription?.normalizedEmail ??
      metadata.normalizedEmail,
  );
  if (!email) return;
  const customer = await ctx.db
    .query("stripeCustomers")
    .withIndex("by_stripe_customer", (range) =>
      range.eq("stripeCustomerId", customerId),
    )
    .unique();
  const frequency =
    storedSubscription?.frequency ??
    maybeRecurringFrequency(metadata.frequency) ??
    "monthly";
  const householdId =
    storedSubscription?.householdId ?? customer?.householdId ?? await householdIdForEmail(ctx, email);
  await recordDonation(ctx, {
    householdId,
    normalizedEmail: email,
    donorFirstName: customer?.firstName,
    donorLastName: customer?.lastName,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripeInvoiceId: String(invoice.id),
    stripePaymentIntentId: stripeId(invoice.payment_intent),
    receiptUrl: stringValue(invoice.hosted_invoice_url),
    amountInCents: numberValue(invoice.amount_paid),
    currency: String(invoice.currency ?? "usd").toLowerCase(),
    frequency,
    status: "paid",
    occurredAt:
      numberValue(invoice.status_transitions?.paid_at || eventCreated) * 1000,
    livemode,
  });
}

async function processSubscription(
  ctx: MutationCtx,
  subscription: StripeSubscription,
  eventCreated: number,
  livemode: boolean,
) {
  const customerId = stripeId(subscription.customer);
  if (!customerId || !subscription.id) return;
  const customer = await ctx.db
    .query("stripeCustomers")
    .withIndex("by_stripe_customer", (range) =>
      range.eq("stripeCustomerId", customerId),
    )
    .unique();
  const email = cleanEmail(
    subscription.metadata?.normalizedEmail ?? customer?.normalizedEmail,
  );
  if (!email) return;
  const item = subscription.items?.data?.[0];
  const frequency =
    maybeRecurringFrequency(subscription.metadata?.frequency) ??
    frequencyFromRecurring(item?.price?.recurring);
  await upsertSubscription(ctx, {
    stripeSubscriptionId: String(subscription.id),
    stripeCustomerId: customerId,
    normalizedEmail: email,
    householdId: customer?.householdId ?? await householdIdForEmail(ctx, email),
    frequency,
    amountInCents: numberValue(
      item?.price?.unit_amount ?? subscription.metadata?.amountInCents,
    ),
    currency: String(item?.price?.currency ?? "usd").toLowerCase(),
    status: String(subscription.status ?? "active"),
    currentPeriodEnd: numberValue(subscription.current_period_end || 0) * 1000 || undefined,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    cancelledAt:
      subscription.status === "canceled"
        ? numberValue(subscription.canceled_at || eventCreated) * 1000
        : undefined,
    livemode,
  });
}

async function upsertStripeCustomer(
  ctx: MutationCtx,
  input: {
    stripeCustomerId: string;
    email: string;
    firstName: string;
    lastName: string;
    householdId?: Id<"households">;
    livemode: boolean;
  },
) {
  const existing = await ctx.db
    .query("stripeCustomers")
    .withIndex("by_stripe_customer", (range) =>
      range.eq("stripeCustomerId", input.stripeCustomerId),
    )
    .unique();
  const now = Date.now();
  const fields = {
    normalizedEmail: input.email,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    householdId: input.householdId,
    livemode: input.livemode,
    updatedAt: now,
  };
  if (existing) {
    await ctx.db.patch(existing._id, fields);
    return existing._id;
  }
  return ctx.db.insert("stripeCustomers", {
    stripeCustomerId: input.stripeCustomerId,
    ...fields,
    createdAt: now,
  });
}

async function upsertSubscription(
  ctx: MutationCtx,
  input: {
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    normalizedEmail: string;
    householdId?: Id<"households">;
    frequency: Exclude<Frequency, "one_time">;
    amountInCents: number;
    currency: string;
    status: string;
    currentPeriodEnd?: number;
    cancelAtPeriodEnd?: boolean;
    cancelledAt?: number;
    livemode: boolean;
  },
) {
  const existing = await ctx.db
    .query("stripeSubscriptions")
    .withIndex("by_stripe_subscription", (range) =>
      range.eq("stripeSubscriptionId", input.stripeSubscriptionId),
    )
    .unique();
  const now = Date.now();
  if (existing) {
    await ctx.db.patch(existing._id, { ...input, updatedAt: now });
    return existing._id;
  }
  return ctx.db.insert("stripeSubscriptions", {
    ...input,
    createdAt: now,
    updatedAt: now,
  });
}

async function recordDonation(
  ctx: MutationCtx,
  input: {
    householdId?: Id<"households">;
    normalizedEmail: string;
    donorFirstName?: string;
    donorLastName?: string;
    stripeCustomerId: string;
    stripeCheckoutSessionId?: string;
    stripePaymentIntentId?: string;
    stripeSubscriptionId?: string;
    stripeInvoiceId?: string;
    receiptUrl?: string;
    amountInCents: number;
    currency: string;
    frequency: Frequency;
    status: string;
    occurredAt: number;
    livemode: boolean;
  },
) {
  if (input.stripeInvoiceId) {
    const existing = await ctx.db
      .query("donations")
      .withIndex("by_stripe_invoice", (range) =>
        range.eq("stripeInvoiceId", input.stripeInvoiceId),
      )
      .unique();
    if (existing) return existing._id;
  }
  if (input.stripeCheckoutSessionId) {
    const existing = await ctx.db
      .query("donations")
      .withIndex("by_checkout_session", (range) =>
        range.eq("stripeCheckoutSessionId", input.stripeCheckoutSessionId),
      )
      .unique();
    if (existing) return existing._id;
  }
  const now = Date.now();
  return ctx.db.insert("donations", {
    ...input,
    createdAt: now,
    updatedAt: now,
  });
}

async function householdIdForEmail(ctx: MutationCtx, normalizedEmail: string) {
  const member = await ctx.db
    .query("householdMembers")
    .withIndex("by_normalized_email", (range) =>
      range.eq("normalizedEmail", normalizedEmail),
    )
    .first();
  if (member) return member.householdId;
  const household = await ctx.db
    .query("households")
    .withIndex("by_normalized_email", (range) =>
      range.eq("normalizedEmail", normalizedEmail),
    )
    .unique();
  return household?._id;
}

function validateDonation(input: {
  firstName: string;
  lastName: string;
  email: string;
  amountInCents: number;
  frequency: Frequency;
}) {
  const firstName = cleanName(input.firstName);
  const lastName = cleanName(input.lastName);
  const normalizedEmail = cleanEmail(input.email);
  if (!firstName || !lastName) {
    throw new ConvexError("Enter your first and last name.");
  }
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new ConvexError("Enter a valid email address.");
  }
  if (
    !Number.isInteger(input.amountInCents) ||
    input.amountInCents < 100 ||
    input.amountInCents > 10_000_000
  ) {
    throw new ConvexError("Enter a donation between $1 and $100,000.");
  }
  return {
    firstName,
    lastName,
    email: normalizedEmail,
    normalizedEmail,
    amountInCents: input.amountInCents,
    frequency: input.frequency,
  };
}

function recurringInterval(frequency: Frequency) {
  if (frequency === "monthly") return { interval: "month", intervalCount: 1 };
  if (frequency === "quarterly") return { interval: "month", intervalCount: 3 };
  if (frequency === "annually") return { interval: "year", intervalCount: 1 };
  return null;
}

function frequencyFromRecurring(
  recurring?: { interval?: string; interval_count?: number },
): Exclude<Frequency, "one_time"> {
  if (recurring?.interval === "year") return "annually";
  if (recurring?.interval === "month" && Number(recurring?.interval_count) === 3) {
    return "quarterly";
  }
  return "monthly";
}

function parseFrequency(value: unknown): Frequency {
  return value === "monthly" || value === "quarterly" || value === "annually"
    ? value
    : "one_time";
}

function maybeRecurringFrequency(
  value: unknown,
): Exclude<Frequency, "one_time"> | undefined {
  return value === "monthly" || value === "quarterly" || value === "annually"
    ? value
    : undefined;
}

function frequencyLabel(frequency: Frequency) {
  if (frequency === "monthly") return "Monthly";
  if (frequency === "quarterly") return "Quarterly";
  if (frequency === "annually") return "Annual";
  return "One-time";
}

async function stripeRequest<T>(path: string, body: URLSearchParams): Promise<T> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new ConvexError("Secure giving is not configured yet.");
  }
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  const result = (await response.json()) as T & {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new ConvexError(
      result.error?.message ?? "Stripe could not start secure checkout.",
    );
  }
  return result;
}

function publicSiteUrl() {
  return (
    process.env.SITE_URL ??
    "https://the-forge-sooty-nine.vercel.app"
  ).replace(/\/$/, "");
}

function stripeLiveMode() {
  return process.env.STRIPE_LIVE_MODE === "true";
}

function cleanName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
}

function cleanEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase().slice(0, 254);
}

function stripeId(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) {
    return String((value as { id: unknown }).id);
  }
  return undefined;
}

function numberValue(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? Math.round(result) : 0;
}

function stringValue(value: unknown) {
  const result = String(value ?? "").trim();
  return result || undefined;
}

function firstNameFromFullName(value: unknown) {
  return cleanName(value).split(" ")[0] ?? "";
}

function lastNameFromFullName(value: unknown) {
  return cleanName(value).split(" ").slice(1).join(" ");
}

type StripeEvent = {
  id: string;
  type: string;
  created: number;
  livemode?: boolean;
  data?: { object?: Record<string, unknown> };
};

type StripeExpandable = string | { id?: string } | null;

type StripeCheckoutSession = {
  id?: string;
  customer?: StripeExpandable;
  customer_details?: { email?: string; name?: string };
  customer_email?: string;
  metadata?: Record<string, string | undefined>;
  amount_total?: number;
  currency?: string;
  subscription?: StripeExpandable;
  payment_intent?: StripeExpandable;
  payment_status?: string;
};

type StripeInvoice = {
  id?: string;
  customer?: StripeExpandable;
  subscription?: StripeExpandable;
  customer_email?: string;
  payment_intent?: StripeExpandable;
  hosted_invoice_url?: string;
  amount_paid?: number;
  currency?: string;
  status_transitions?: { paid_at?: number };
  parent?: {
    subscription_details?: {
      subscription?: StripeExpandable;
      metadata?: Record<string, string | undefined>;
    };
  };
  lines?: {
    data?: Array<{ metadata?: Record<string, string | undefined> }>;
  };
};

type StripeSubscription = {
  id?: string;
  customer?: StripeExpandable;
  metadata?: Record<string, string | undefined>;
  status?: string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  canceled_at?: number;
  items?: {
    data?: Array<{
      price?: {
        unit_amount?: number;
        currency?: string;
        recurring?: { interval?: string; interval_count?: number };
      };
    }>;
  };
};
