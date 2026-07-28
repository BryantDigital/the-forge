"use client";

import { useState } from "react";
import {
  SMS_CONSENT_TEXT,
  type EventNotificationRequest,
} from "../lib/event-notifications";

type NotificationMode = "registration" | "waitlist";

export function EventNotificationForm({
  mode,
  eventSlug,
}: {
  mode: NotificationMode;
  eventSlug: string;
}) {
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [status, setStatus] = useState<
    { type: "idle" } | { type: "submitting" } | { type: "success" } | { type: "error"; message: string }
  >({ type: "idle" });

  const title = mode === "waitlist" ? "Join the waitlist" : "Get registration alerts";
  const description =
    mode === "waitlist"
      ? "We’ll contact you when enough seats open for your entire family request."
      : "Be first to know when registration opens. Choose email, text, or both.";

  return (
    <form
      className="event-notification-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        const payload: EventNotificationRequest = {
          eventSlug,
          kind: mode === "waitlist" ? "waitlist" : "registration_open",
          parentName: String(form.get("parentName") ?? ""),
          emailEnabled,
          smsEnabled,
          email: String(form.get("email") ?? ""),
          mobilePhone: String(form.get("mobilePhone") ?? ""),
          smsConsent: form.get("smsConsent") === "on",
        };

        setStatus({ type: "submitting" });

        try {
          const response = await fetch("/api/event-notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const result = (await response.json()) as { error?: string };

          if (!response.ok) {
            setStatus({
              type: "error",
              message: result.error ?? "We could not save your alert. Please try again.",
            });
            return;
          }

          setStatus({ type: "success" });
          formElement.reset();
        } catch {
          setStatus({
            type: "error",
            message: "We could not save your alert. Please check your connection and try again.",
          });
        }
      }}
    >
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
            {SMS_CONSENT_TEXT}
          </span>
        </label>
      )}

      <button
        className="button button--red event-notification-submit"
        type="submit"
        disabled={!emailEnabled && !smsEnabled || status.type === "submitting"}
      >
        {status.type === "submitting"
          ? "Saving your alert…"
          : mode === "waitlist"
            ? "Join the waitlist"
            : "Notify me when it opens"}
        <span aria-hidden="true">→</span>
      </button>
      <div className="event-notification-form__status" aria-live="polite">
        {status.type === "success" && (
          <p className="form-status form-status--success">
            You&apos;re on the list. We&apos;ll notify you using your selected contact methods.
          </p>
        )}
        {status.type === "error" && (
          <p className="form-status form-status--error">{status.message}</p>
        )}
      </div>
      <p className="event-notification-form__fine-print">
        Operational event notices only. This does not subscribe you to the
        general Forge newsletter.
      </p>
    </form>
  );
}
