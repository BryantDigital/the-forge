"use client";

import { useMemo, useState } from "react";

const frequencies = [
  { value: "once", label: "One time", suffix: "" },
  { value: "monthly", label: "Monthly", suffix: "/ month" },
  { value: "quarterly", label: "Quarterly", suffix: "/ quarter" },
  { value: "annually", label: "Annually", suffix: "/ year" },
] as const;

const presetAmounts = [10, 25, 50, 100, 250, 500];

export function DonationForm() {
  const [frequency, setFrequency] = useState<(typeof frequencies)[number]["value"]>("monthly");
  const [amount, setAmount] = useState<number | "custom">(50);
  const [customAmount, setCustomAmount] = useState("");

  const selectedFrequency = frequencies.find((item) => item.value === frequency) ?? frequencies[1];
  const displayAmount = amount === "custom" ? Number(customAmount || 0) : amount;
  const formattedAmount = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(displayAmount),
    [displayAmount],
  );

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
        onSubmit={(event) => event.preventDefault()}
      >
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

        <button className="button button--red donation-submit" type="submit">
          Continue to secure giving <span aria-hidden="true">→</span>
        </button>
      </form>

      <div className="donation-card__trust">
        <span aria-hidden="true">✓</span>
        <p><strong>Protected by Stripe</strong> Card and bank account payments are encrypted and securely processed.</p>
      </div>
    </aside>
  );
}
