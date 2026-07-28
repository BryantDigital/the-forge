"use client";

import { useMutation } from "convex/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";

type Role = {
  title: string;
  details: Array<{ label: string; text: string }>;
};

type FaithItem = {
  title: string;
  belief: string;
  reference: string;
};

export function VolunteerApplicationForm({
  roles,
  statementOfFaith,
}: {
  roles: Role[];
  statementOfFaith: FaithItem[];
}) {
  const submitApplication = useMutation(api.volunteers.submit);
  const startedAt = useRef(0);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "submitting" }
    | { type: "error"; message: string }
    | { type: "success" }
  >({ type: "idle" });

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  if (status.type === "success") {
    return (
      <div className="shell volunteer-success">
        <div className="donation-complete__mark" aria-hidden="true">✓</div>
        <p className="eyebrow">Application received</p>
        <h2>Thank you for raising your hand.</h2>
        <p>
          A Forge leader will review your application. If you are accepted,
          you’ll receive a secure email link to review and sign the volunteer
          commitment.
        </p>
        <Link className="button button--red" href="/">
          Return home <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  return (
    <form
      className="shell content-grid volunteer-layout"
      onSubmit={async (event) => {
        event.preventDefault();
        setStatus({ type: "submitting" });
        const form = new FormData(event.currentTarget);
        try {
          await submitApplication({
            firstName: String(form.get("firstName") ?? ""),
            lastName: String(form.get("lastName") ?? ""),
            email: String(form.get("email") ?? ""),
            mobilePhone: String(form.get("mobilePhone") ?? ""),
            roleInterests: selectedRoles,
            statementOfFaithAccepted:
              form.get("statementOfFaithAccepted") === "on",
            faithResponse: String(form.get("faithResponse") ?? ""),
            backgroundCheckAccepted:
              form.get("backgroundCheckAccepted") === "on",
            website: String(form.get("website") ?? ""),
            submissionStartedAt: startedAt.current,
          });
          setStatus({ type: "success" });
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) {
          setStatus({
            type: "error",
            message: cleanConvexError(error),
          });
        }
      }}
    >
      <article>
        <div className="form-section form-section--first">
          <p className="eyebrow">Volunteer application</p>
          <h2>Bring what you have.</h2>
          <p className="lede volunteer-lede">
            Choose the areas where your skills and experience can make the
            biggest impact. A representative from The Forge will contact you
            with more information.
          </p>
          <div className="field-grid">
            <label className="field">
              <span>First name</span>
              <input className="form-control" name="firstName" autoComplete="given-name" required />
            </label>
            <label className="field">
              <span>Last name</span>
              <input className="form-control" name="lastName" autoComplete="family-name" required />
            </label>
            <label className="field">
              <span>Email address</span>
              <input className="form-control" name="email" type="email" autoComplete="email" required />
            </label>
            <label className="field">
              <span>Mobile number</span>
              <input className="form-control" name="mobilePhone" type="tel" autoComplete="tel" required />
            </label>
            <label className="volunteer-honeypot" aria-hidden="true">
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
        </div>

        <div className="form-section">
          <p className="eyebrow">Step into the mission</p>
          <h2>Select all positions that apply.</h2>
          <p className="volunteer-intro">
            Every role at The Forge serves a purpose—whether it&apos;s leading
            from the front, supporting behind the scenes, or calling out
            character in the heat of competition.
          </p>
          <div className="volunteer-role-list">
            {roles.map((role) => (
              <label className="volunteer-role-card" key={role.title}>
                <div>
                  <h3>{role.title}</h3>
                  {role.details.map((detail) => (
                    <p key={detail.label}>
                      <strong>{detail.label}:</strong> {detail.text}
                    </p>
                  ))}
                </div>
                <span className="volunteer-role-card__choice">
                  <input
                    type="checkbox"
                    name="roles"
                    value={role.title}
                    checked={selectedRoles.includes(role.title)}
                    onChange={(event) => {
                      setSelectedRoles((current) =>
                        event.target.checked
                          ? [...current, role.title]
                          : current.filter((item) => item !== role.title),
                      );
                    }}
                  />
                  <span>Sign me up</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-section">
          <p className="eyebrow">Required affirmation</p>
          <h2>Statement of Faith</h2>
          <div className="faith-list">
            {statementOfFaith.map((item) => (
              <div className="faith-item" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.belief}</p>
                <small>Reference: {item.reference}</small>
              </div>
            ))}
          </div>
          <label className="checkbox-row affirmation">
            <input name="statementOfFaithAccepted" type="checkbox" required />
            <span>I support and affirm this Statement of Faith.</span>
          </label>
        </div>

        <div className="form-section">
          <p className="eyebrow">Tell us about you</p>
          <label className="field field--full">
            <span>Who is Jesus to you?</span>
            <small>
              Whether you&apos;ve known Him your whole life or are just
              starting to learn about Him, what does Jesus mean to you today?
            </small>
            <textarea className="form-control" name="faithResponse" minLength={15} required />
          </label>
          <label className="checkbox-row affirmation">
            <input name="backgroundCheckAccepted" type="checkbox" required />
            <span>
              I am willing to undergo a background check if required for my
              volunteer role.
            </span>
          </label>
          {selectedRoles.length === 0 && (
            <p className="form-hint">Select at least one volunteer position above.</p>
          )}
          {status.type === "error" && (
            <p className="form-status form-status--error" role="alert">
              {status.message}
            </p>
          )}
          <button
            className="button button--red submit-button"
            type="submit"
            disabled={
              status.type === "submitting" || selectedRoles.length === 0
            }
          >
            {status.type === "submitting"
              ? "Submitting application…"
              : "Submit application"}
          </button>
        </div>
      </article>

      <aside className="panel volunteer-aside">
        <h3>What happens next?</h3>
        <div className="detail-list">
          <div><span>01</span><strong>Submit your interests</strong></div>
          <div><span>02</span><strong>A Forge leader reviews your application</strong></div>
          <div><span>03</span><strong>Accepted volunteers sign a simple agreement</strong></div>
          <div><span>04</span><strong>Signed applications become approved</strong></div>
        </div>
        <div className="aside-note">
          <strong>Questions?</strong>
          <p>Email <a href="mailto:info@forgeva.com">info@forgeva.com</a>.</p>
        </div>
      </aside>
    </form>
  );
}

function cleanConvexError(error: unknown) {
  if (!(error instanceof Error)) return "We could not submit your application.";
  return (
    error.message.match(/Uncaught ConvexError:\s*([^\n]+)/)?.[1] ??
    "We could not submit your application. Please try again."
  );
}
