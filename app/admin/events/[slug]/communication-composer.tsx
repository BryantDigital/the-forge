"use client";

import { useMemo, useState } from "react";

type Channel = "email" | "sms" | "both";

export function CommunicationComposer() {
  const [channel, setChannel] = useState<Channel>("both");
  const [audience, setAudience] = useState("registered");
  const [message, setMessage] = useState(
    "Reminder: The Forge is this Saturday from 3:00–6:00 PM. Bring a water bottle, Bible, and your Forge shirt. Reply to this message if your plans have changed.",
  );

  const recipients = useMemo(() => {
    if (audience === "waitlisted") return { email: 4, sms: 3 };
    if (audience === "all") return { email: 28, sms: 24 };
    return { email: 24, sms: 21 };
  }, [audience]);

  return (
    <section className="communication-card" id="message-families">
      <div className="communication-card__header">
        <div>
          <p className="eyebrow">Event communications</p>
          <h2>Message families</h2>
          <p>Send a logistical update by Mailchimp email, Twilio SMS, or both.</p>
        </div>
        <span className="communication-status communication-status--setup">
          <i /> Provider setup required
        </span>
      </div>

      <form className="communication-form" onSubmit={(event) => event.preventDefault()}>
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
            <select className="form-control" value={audience} onChange={(event) => setAudience(event.target.value)}>
              <option value="registered">Registered families</option>
              <option value="waitlisted">Waitlisted families</option>
              <option value="all">Everyone attached to this event</option>
            </select>
          </label>
        </div>

        {(channel === "email" || channel === "both") && (
          <label className="field">
            <span>Email subject</span>
            <input className="form-control" defaultValue="Important details for The Forge — September 12" required />
          </label>
        )}

        <label className="field">
          <span>Message</span>
          <textarea
            className="form-control communication-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={channel === "sms" ? 320 : 1200}
            required
          />
          <small>
            {message.length} characters
            {(channel === "sms" || channel === "both") && " · Twilio will segment longer texts automatically"}
          </small>
        </label>

        <div className="communication-preview">
          <div>
            <span>Delivery estimate</span>
            <strong>
              {(channel === "email" || channel === "both") && `${recipients.email} emails`}
              {channel === "both" && " + "}
              {(channel === "sms" || channel === "both") && `${recipients.sms} opted-in texts`}
            </strong>
          </div>
          <p>Families without SMS consent will receive email only.</p>
        </div>

        <div className="communication-actions">
          <button className="choice" type="button">Send a test</button>
          <button className="button button--red" type="submit">
            Send notification <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    </section>
  );
}
