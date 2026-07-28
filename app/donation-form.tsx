"use client";

import { useAction } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "../convex/_generated/api";

const frequencies = [
  { value: "one_time", label: "One time", suffix: "" },
  { value: "monthly", label: "Monthly", suffix: "/ month" },
  { value: "quarterly", label: "Quarterly", suffix: "/ quarter" },
  { value: "annually", label: "Annually", suffix: "/ year" },
] as const;

const presetAmounts = [10, 25, 50, 100, 250, 500];

export function DonationForm({
  checkoutComplete = false,
  checkoutCancelled = false,
}: {
  checkoutComplete?: boolean;
  checkoutCancelled?: boolean;
}) {
  const createCheckoutSession = useAction(api.donations.createCheckoutSession);
  const [frequency, setFrequency] = useState<(typeof frequencies)[number]["value"]>("monthly");
  const [amount, setAmount] = useState<number | "custom">(50);
  const [customAmount, setCustomAmount] = useState("");
  const [status, setStatus] = useState<
    { type: "idle" } |
    { type: "submitting" } |
    { type: "error"; message: string }
  >({ type: "idle" });

  const selectedFrequency = frequencies.find((item) => item.value === frequency) ?? frequencies[1];
  const displayAmount = amount === "custom" ? Number(customAmount || 0) : amount;
  const formattedAmount = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(displayAmount),
    [displayAmount],
  );

  if (checkoutComplete) {
    return (
      <aside className="donation-card donation-complete" data-reveal>
        <div className="donation-complete__mark" aria-hidden="true">✓</div>
        <p className="donation-card__eyebrow">Thank you</p>
        <h3>Your generosity strengthens the mission.</h3>
        <p>
          Stripe is processing your gift and will email your receipt. Bank gifts
          can take several business days to finish.
        </p>
        <div className="registration-success__actions">
          <Link className="button button--red" href="/account">
            View your Forge account
          </Link>
          <Link className="button button--dark" href="/">
            Return home
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside className="donation-card" data-reveal>
      <div className="donation-card__top">
        <div>
          <p className="donation-card__eyebrow">Secure online giving</p>
          <h3>Make a donation</h3>
        </div>
        <img src="/images/forge-crest.png" alt="" />
      </div>

      <form
        className="donation-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setStatus({ type: "submitting" });
          const form = new FormData(event.currentTarget);
          const amountInDollars =
            amount === "custom" ? Number(customAmount) : amount;
          try {
            const result = await createCheckoutSession({
              firstName: String(form.get("firstName") ?? ""),
              lastName: String(form.get("lastName") ?? ""),
              email: String(form.get("email") ?? ""),
              amountInCents: Math.round(amountInDollars * 100),
              frequency,
            });
            window.location.assign(result.url);
          } catch (error) {
            setStatus({
              type: "error",
              message:
                error instanceof Error
                  ? cleanConvexError(error.message)
                  : "Secure giving is temporarily unavailable.",
            });
          }
        }}
      >
        {checkoutCancelled && status.type === "idle" && (
          <p className="donation-cancelled">
            No gift was submitted. Your selections are ready whenever you are.
          </p>
        )}
        <fieldset className="donation-fieldset">
          <legend>Choose a frequency</legend>
          <div className="frequency-toggle">
            {frequencies.map((item) => (
              <button
                className={frequency === item.value ? "is-selected" : ""}
                type="button"
                aria-pressed={frequency === item.value}
                onClick={() => setFrequency(item.value)}
                key={item.value}
              >
                {item.label}
              </button>
            ))}
          </div>
          <input type="hidden" name="frequency" value={frequency} />
        </fieldset>

        <fieldset className="donation-fieldset">
          <legend>Select your gift</legend>
          <div className="donation-amounts">
            {presetAmounts.map((preset) => (
              <button
                className={`choice ${amount === preset ? "is-selected" : ""}`}
                type="button"
                aria-pressed={amount === preset}
                onClick={() => setAmount(preset)}
                key={preset}
              >
                ${preset}
              </button>
            ))}
            <button
              className={`choice ${amount === "custom" ? "is-selected" : ""}`}
              type="button"
              aria-pressed={amount === "custom"}
              onClick={() => setAmount("custom")}
            >
              Custom
            </button>
          </div>
          <input type="hidden" name="amount" value={amount === "custom" ? customAmount : amount} />
          <div className={`custom-amount ${amount === "custom" ? "is-visible" : ""}`}>
            <span aria-hidden="true">$</span>
            <label>
              <span className="sr-only">Custom gift amount</span>
              <input
                inputMode="decimal"
                min="1"
                name="customAmount"
                onChange={(event) => setCustomAmount(event.target.value)}
                placeholder="Enter amount"
                required={amount === "custom"}
                type="number"
                value={customAmount}
              />
            </label>
            <small>USD</small>
          </div>
        </fieldset>

        <div className="donation-impact" aria-live="polite">
          <span>Your {selectedFrequency.label.toLowerCase()} gift</span>
          <strong>{formattedAmount}{selectedFrequency.suffix}</strong>
          <p>helps create Christ-centered spaces where boys grow in strength, character, and faith.</p>
        </div>

        <div className="field-grid donation-details">
          <label className="field">
            <span>First name</span>
            <input className="form-control" name="firstName" autoComplete="given-name" required />
          </label>
          <label className="field">
            <span>Last name</span>
            <input className="form-control" name="lastName" autoComplete="family-name" required />
          </label>
          <label className="field field--full">
            <span>Email address</span>
            <input className="form-control" name="email" type="email" autoComplete="email" required />
          </label>
        </div>

        {status.type === "error" && (
          <p className="form-status form-status--error" role="alert">
            {status.message}
          </p>
        )}

        <button
          className="button button--red donation-submit"
          type="submit"
          disabled={status.type === "submitting" || displayAmount < 1}
        >
          {status.type === "submitting"
            ? "Opening secure checkout…"
            : "Continue to secure giving"}{" "}
          <span aria-hidden="true">→</span>
        </button>
      </form>

      <div className="donation-card__trust">
        <span aria-hidden="true">✓</span>
        <p><strong>Protected by Stripe</strong> Card and bank account payments are encrypted and securely processed.</p>
      </div>
    </aside>
  );
}

function cleanConvexError(message: string) {
  return message.match(/Uncaught ConvexError:\s*([^\n]+)/)?.[1] ?? message;
}
