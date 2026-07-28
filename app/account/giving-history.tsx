"use client";

import { useAction, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

export function GivingHistory() {
  const giving = useQuery(api.donations.getMyGiving);
  const createPortal = useAction(api.donations.createMyPortalSession);
  const [portalError, setPortalError] = useState("");
  const [openingPortal, setOpeningPortal] = useState(false);

  if (giving === undefined) {
    return (
      <section className="account-giving" aria-busy="true">
        <p className="eyebrow">Giving</p>
        <h3>Loading your giving…</h3>
      </section>
    );
  }
  if (!giving) return null;

  const activeSubscriptions = giving.subscriptions.filter((subscription) =>
    ["active", "trialing", "past_due"].includes(subscription.status),
  );

  return (
    <section className="account-giving">
      <div className="account-section-heading">
        <div>
          <p className="eyebrow">Giving</p>
          <h3>Your generosity at work.</h3>
        </div>
        <div className="account-giving__actions">
          <Link className="text-link" href="/donate">Make a gift →</Link>
          {giving.hasStripeCustomer && (
            <button
              className="button button--dark button--small"
              type="button"
              disabled={openingPortal}
              onClick={async () => {
                setOpeningPortal(true);
                setPortalError("");
                try {
                  const result = await createPortal();
                  window.location.assign(result.url);
                } catch (error) {
                  setPortalError(
                    error instanceof Error
                      ? cleanConvexError(error.message)
                      : "Stripe billing management is unavailable.",
                  );
                  setOpeningPortal(false);
                }
              }}
            >
              {openingPortal ? "Opening Stripe…" : "Manage recurring gifts"}
            </button>
          )}
        </div>
      </div>

      {portalError && (
        <p className="form-status form-status--error">{portalError}</p>
      )}

      {activeSubscriptions.length > 0 && (
        <div className="account-recurring-list">
          {activeSubscriptions.map((subscription) => (
            <article key={subscription.id}>
              <span>{frequencyLabel(subscription.frequency)} gift</span>
              <strong>{formatMoney(subscription.amountInCents, subscription.currency)}</strong>
              <em>
                {subscriptionStatus(
                  subscription.status,
                  subscription.cancelAtPeriodEnd,
                  subscription.currentPeriodEnd,
                )}
              </em>
            </article>
          ))}
        </div>
      )}

      {giving.donations.length > 0 ? (
        <div className="account-gift-list">
          {giving.donations.slice(0, 12).map((donation) => (
            <article key={donation.id}>
              <div>
                <strong>{formatMoney(donation.amountInCents, donation.currency)}</strong>
                <span>{frequencyLabel(donation.frequency)} · {formatDate(donation.occurredAt)}</span>
              </div>
              {donation.receiptUrl ? (
                <a className="text-link" href={donation.receiptUrl} target="_blank" rel="noreferrer">
                  Receipt ↗
                </a>
              ) : (
                <span className="account-gift-list__receipt">Receipt emailed by Stripe</span>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="account-empty-state">
          <strong>No completed gifts connected yet.</strong>
          <p>
            Donations made with this email will appear automatically after Stripe
            confirms the payment.
          </p>
          <Link className="text-link" href="/donate">Give to The Forge →</Link>
        </div>
      )}
    </section>
  );
}

function formatMoney(amountInCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

function frequencyLabel(
  frequency: "one_time" | "monthly" | "quarterly" | "annually",
) {
  if (frequency === "one_time") return "One-time gift";
  if (frequency === "annually") return "Annual";
  return frequency.charAt(0).toUpperCase() + frequency.slice(1);
}

function subscriptionStatus(
  status: string,
  cancelAtPeriodEnd?: boolean,
  currentPeriodEnd?: number,
) {
  if (cancelAtPeriodEnd && currentPeriodEnd) {
    return `Cancels ${new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(currentPeriodEnd)}`;
  }
  if (status === "past_due") return "Payment needs attention";
  if (status === "trialing") return "Starting";
  return "Active";
}

function cleanConvexError(message: string) {
  return message.match(/Uncaught ConvexError:\s*([^\n]+)/)?.[1] ?? message;
}
