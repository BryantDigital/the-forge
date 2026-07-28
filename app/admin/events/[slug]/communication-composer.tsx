"use client";

import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type Channel = "email" | "sms" | "both";
type Audience = "registered" | "waitlisted" | "all_event_families";

export function CommunicationComposer({
  eventId,
  eventTitle,
  registeredFamilies,
  registeredSms,
  waitlistedFamilies,
  waitlistedSms,
}: {
  eventId: Id<"events">;
  eventTitle: string;
  registeredFamilies: number;
  registeredSms: number;
  waitlistedFamilies: number;
  waitlistedSms: number;
}) {
  const queueBroadcast = useMutation(api.communications.queueBroadcast);
  const providers = useQuery(api.communications.getProviderStatus);
  const history = useQuery(api.communications.listEventHistory, { eventId });
  const [channel, setChannel] = useState<Channel>("both");
  const [audience, setAudience] = useState<Audience>("registered");
  const [subject, setSubject] = useState(`Important details for ${eventTitle}`);
  const [message, setMessage] = useState(
    "Reminder: The Forge is this Saturday from 3:00–6:00 PM. Bring a water bottle, Bible, and your Forge shirt. Reply to this message if your plans have changed.",
  );
  const [testMode, setTestMode] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [status, setStatus] = useState<
    { type: "idle" } |
    { type: "sending" } |
    { type: "success"; message: string } |
    { type: "error"; message: string }
  >({ type: "idle" });

  const recipients = useMemo(() => {
    if (audience === "waitlisted") {
      return { email: waitlistedFamilies, sms: waitlistedSms };
    }
    if (audience === "all_event_families") {
      return {
        email: registeredFamilies + waitlistedFamilies,
        sms: registeredSms + waitlistedSms,
      };
    }
    return { email: registeredFamilies, sms: registeredSms };
  }, [
    audience,
    registeredFamilies,
    registeredSms,
    waitlistedFamilies,
    waitlistedSms,
  ]);

  const emailRequested = channel === "email" || channel === "both";
  const smsRequested = channel === "sms" || channel === "both";
  const providersReady =
    providers &&
    (!emailRequested || providers.email) &&
    (!smsRequested || providers.sms);

  return (
    <section className="communication-card" id="message-families">
      <div className="communication-card__header">
        <div>
          <p className="eyebrow">Event communications</p>
          <h2>Message families</h2>
          <p>Send a branded email, a consented Twilio text, or both.</p>
        </div>
        <span className={`communication-status ${providersReady ? "" : "communication-status--setup"}`}>
          <i />{" "}
          {providers === undefined
            ? "Checking providers"
            : providersReady
              ? "Providers connected"
              : providerLabel(providers)}
        </span>
      </div>

      <form
        className="communication-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (
            !testMode &&
            !window.confirm(
              `Send this ${channel} message to ${audienceLabel(audience).toLowerCase()}?`,
            )
          ) {
            return;
          }
          setStatus({ type: "sending" });
          try {
            await queueBroadcast({
              eventId,
              channel,
              audience,
              subject: emailRequested ? subject : undefined,
              body: message,
              isTest: testMode,
              testEmail: testMode && emailRequested ? testEmail || undefined : undefined,
              testPhone: testMode && smsRequested ? testPhone || undefined : undefined,
            });
            setStatus({
              type: "success",
              message: testMode
                ? "Test queued. Delivery results will appear below."
                : "Message queued. Delivery results will update below.",
            });
          } catch (error) {
            setStatus({
              type: "error",
              message: cleanError(error),
            });
          }
        }}
      >
        <div className="communication-form__controls">
          <fieldset className="communication-fieldset">
            <legend>Send using</legend>
            <div className="channel-toggle">
              {(["email", "sms", "both"] as const).map((option) => (
                <button
                  className={channel === option ? "is-selected" : ""}
                  type="button"
                  aria-pressed={channel === option}
                  onClick={() => setChannel(option)}
                  key={option}
                >
                  {option === "sms" ? "SMS" : option[0].toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="field">
            <span>Audience</span>
            <select
              className="form-control"
              value={audience}
              onChange={(event) => setAudience(event.target.value as Audience)}
              disabled={testMode}
            >
              <option value="registered">Confirmed families</option>
              <option value="waitlisted">Waitlisted families</option>
              <option value="all_event_families">Everyone attached to this event</option>
            </select>
          </label>
        </div>

        {emailRequested && (
          <label className="field">
            <span>Email subject</span>
            <input
              className="form-control"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={160}
              required
            />
          </label>
        )}

        <label className="field">
          <span>Message</span>
          <textarea
            className="form-control communication-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={1_200}
            required
          />
          <small>
            {message.length} characters
            {smsRequested && " · Twilio may segment longer texts"}
          </small>
        </label>

        {testMode && (
          <div className="communication-test-panel">
            <div>
              <p className="eyebrow">Test delivery</p>
              <strong>Only these contacts will receive this test.</strong>
            </div>
            <div className="communication-test-fields">
              {emailRequested && (
                <label className="field">
                  <span>Test email</span>
                  <input
                    className="form-control"
                    type="email"
                    value={testEmail}
                    onChange={(event) => setTestEmail(event.target.value)}
                    placeholder="Defaults to your admin email"
                  />
                </label>
              )}
              {smsRequested && (
                <label className="field">
                  <span>Test mobile</span>
                  <input
                    className="form-control"
                    type="tel"
                    value={testPhone}
                    onChange={(event) => setTestPhone(event.target.value)}
                    placeholder="(757) 555-0123"
                    required
                  />
                </label>
              )}
            </div>
          </div>
        )}

        <div className="communication-preview">
          <div>
            <span>{testMode ? "Test delivery" : "Delivery estimate"}</span>
            <strong>
              {testMode
                ? `${emailRequested ? "1 email" : ""}${channel === "both" ? " + " : ""}${smsRequested ? "1 text" : ""}`
                : `${emailRequested ? `${recipients.email} emails` : ""}${channel === "both" ? " + " : ""}${smsRequested ? `${recipients.sms} consented texts` : ""}`}
            </strong>
          </div>
          <p>
            {testMode
              ? "Test messages are labeled and never sent to the event audience."
              : "Texts exclude anyone without consent or anyone who has replied STOP."}
          </p>
        </div>

        {status.type === "success" && (
          <p className="form-status form-status--success" aria-live="polite">{status.message}</p>
        )}
        {status.type === "error" && (
          <p className="form-status form-status--error" aria-live="polite">{status.message}</p>
        )}

        <div className="communication-actions">
          <button
            className="choice"
            type="button"
            onClick={() => {
              setTestMode((current) => !current);
              setStatus({ type: "idle" });
            }}
          >
            {testMode ? "Exit test mode" : "Send a test"}
          </button>
          <button
            className="button button--red"
            type="submit"
            disabled={status.type === "sending" || !providersReady}
          >
            {status.type === "sending"
              ? "Queueing…"
              : testMode
                ? "Send test"
                : "Send notification"}{" "}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>

      <div className="communication-history">
        <div className="communication-history__heading">
          <div>
            <p className="eyebrow">Delivery history</p>
            <h3>Recent messages</h3>
          </div>
          <span>Automatic reminders run hourly</span>
        </div>
        <div className="communication-history__list">
          {(history ?? []).map((item) => (
            <article className="communication-history__row" key={item.id}>
              <span className={`communication-channel communication-channel--${item.channel}`}>
                {item.channel === "sms" ? "SMS" : "Email"}
              </span>
              <div>
                <strong>
                  {item.isTest ? "Test · " : ""}
                  {kindLabel(item.kind)}
                </strong>
                <p>{item.subject ?? item.body}</p>
              </div>
              <div className="communication-history__result">
                <span className={`tag ${item.status === "sent" ? "tag--green" : item.status === "failed" ? "tag--red" : ""}`}>
                  {statusLabel(item.status)}
                </span>
                <small>
                  {item.recipientCount} recipient{item.recipientCount === 1 ? "" : "s"}
                  {item.failed > 0 ? ` · ${item.failed} failed` : ""}
                </small>
              </div>
            </article>
          ))}
          {history?.length === 0 && (
            <div className="communication-history__empty">
              No messages sent yet. Tests and reminders will appear here.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function providerLabel(providers: { email: boolean; sms: boolean }) {
  if (!providers.email && !providers.sms) return "Providers not configured";
  if (!providers.email) return "Email setup required";
  if (!providers.sms) return "SMS setup required";
  return "Providers connected";
}

function audienceLabel(audience: Audience) {
  if (audience === "registered") return "Confirmed families";
  if (audience === "waitlisted") return "Waitlisted families";
  return "All event families";
}

function kindLabel(kind: string) {
  if (kind === "week_reminder") return "Week-of reminder";
  if (kind === "day_of_reminder") return "Day-of reminder";
  if (kind === "admin_broadcast") return "Admin message";
  return kind.replaceAll("_", " ");
}

function statusLabel(status: string) {
  if (status === "partially_failed") return "Partially sent";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function cleanError(error: unknown) {
  if (!(error instanceof Error)) return "The message could not be queued.";
  return error.message.replace(/^.*Uncaught (?:ConvexError|Error): /, "").split("\n")[0];
}
