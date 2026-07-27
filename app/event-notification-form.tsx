"use client";

import { useState } from "react";

type NotificationMode = "registration" | "waitlist";

export function EventNotificationForm({ mode }: { mode: NotificationMode }) {
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);

  const title = mode === "waitlist" ? "Join the waitlist" : "Get registration alerts";
  const description =
    mode === "waitlist"
      ? "We’ll contact you when enough seats open for your entire family request."
      : "Be first to know when registration opens. Choose email, text, or both.";

  return (
    <form className="event-notification-form" onSubmit={(event) => event.preventDefault()}>
      <div className="event-notification-form__heading">
        <p className="event-notification-form__eyebrow">
          {mode === "waitlist" ? "Event currently full" : "Registration opens September 1"}
        </p>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <fieldset className="notification-channels">
        <legend>Notify me by</legend>
        <div>
          <button
            className={emailEnabled ? "is-selected" : ""}
            type="button"
            aria-pressed={emailEnabled}
            onClick={() => setEmailEnabled((current) => !current)}
          >
            <span aria-hidden="true">@</span>
            Email
          </button>
          <button
            className={smsEnabled ? "is-selected" : ""}
            type="button"
            aria-pressed={smsEnabled}
            onClick={() => setSmsEnabled((current) => !current)}
          >
            <span aria-hidden="true">▣</span>
            Text message
          </button>
        </div>
      </fieldset>

      <div className="field-grid notification-fields">
        <label className="field field--full">
          <span>Parent or guardian name</span>
          <input className="form-control" name="parentName" autoComplete="name" required />
        </label>
        <label className="field field--full">
          <span>Email address</span>
          <input
            className="form-control"
            name="email"
            type="email"
            autoComplete="email"
            disabled={!emailEnabled}
            required={emailEnabled}
            placeholder="parent@example.com"
          />
        </label>
        <label className="field field--full">
          <span>Mobile number</span>
          <input
            className="form-control"
            name="mobilePhone"
            type="tel"
            autoComplete="tel"
            disabled={!smsEnabled}
            required={smsEnabled}
            placeholder="(757) 555-0123"
          />
        </label>
      </div>

      {smsEnabled && (
        <label className="checkbox-row notification-consent">
          <input type="checkbox" name="smsConsent" required />
          <span>
            I agree to receive event-related text messages from The Forge.
            Message frequency varies. Message and data rates may apply. Reply
            STOP to unsubscribe.
          </span>
        </label>
      )}

      <button
        className="button button--red event-notification-submit"
        type="submit"
        disabled={!emailEnabled && !smsEnabled}
      >
        {mode === "waitlist" ? "Join the waitlist" : "Notify me when it opens"}
        <span aria-hidden="true">→</span>
      </button>
      <p className="event-notification-form__fine-print">
        Operational event notices only. This does not subscribe you to the
        general Forge newsletter.
      </p>
    </form>
  );
}
