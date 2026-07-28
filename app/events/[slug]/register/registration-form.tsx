"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { RSVP_SMS_CONSENT_TEXT, type RsvpRequest } from "../../../../lib/rsvp";
import { SectionEyebrow } from "../../../components";

type ChildDraft = {
  key: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  statedAge: string;
  allergies: string;
  notes: string;
};

export function RegistrationForm({
  eventSlug,
  eventTitle,
  mode,
  remaining,
}: {
  eventSlug: string;
  eventTitle: string;
  mode: "registration" | "waitlist";
  remaining: number;
}) {
  const account = useQuery(api.registrations.getMyAccount);
  const [children, setChildren] = useState<ChildDraft[]>([newChild(1)]);
  const [nextKey, setNextKey] = useState(2);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "submitting" }
    | { type: "error"; message: string }
    | { type: "success"; registrationStatus: "confirmed" | "waitlisted"; managementUrl: string }
  >({ type: "idle" });

  if (status.type === "success") {
    const confirmed = status.registrationStatus === "confirmed";
    return (
      <div className="shell registration-success panel">
        <SectionEyebrow>{confirmed ? "Registration confirmed" : "Waitlist confirmed"}</SectionEyebrow>
        <h2>{confirmed ? "Their places are reserved." : "Your family is on the list."}</h2>
        <p>
          {confirmed
            ? `We reserved ${children.length} ${children.length === 1 ? "spot" : "spots"} for ${eventTitle}.`
            : `We’ll email you when enough seats open for your entire ${children.length}-seat request.`}
        </p>
        <p>A confirmation and secure management link have been sent to your email.</p>
        <div className="registration-success__actions">
          <Link className="button button--red" href={status.managementUrl}>
            Manage registration
          </Link>
          <Link className="button button--dark" href={`/events/${eventSlug}`}>
            Return to event
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="shell content-grid registration-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setStatus({ type: "submitting" });
        const form = new FormData(event.currentTarget);
        const payload: RsvpRequest = {
          eventSlug,
          parentFirstName: String(form.get("parentFirstName") ?? ""),
          parentLastName: String(form.get("parentLastName") ?? ""),
          email: String(form.get("email") ?? ""),
          mobilePhone: String(form.get("mobilePhone") ?? ""),
          emergencyContactName: String(form.get("emergencyContactName") ?? ""),
          emergencyContactPhone: String(form.get("emergencyContactPhone") ?? ""),
          children: children.map((child) => ({
            firstName: child.firstName,
            lastName: child.lastName,
            birthDate: child.birthDate,
            statedAge: Number(child.statedAge),
            allergies: child.allergies,
            notes: child.notes,
          })),
          waiverAccepted: form.get("waiverAccepted") === "on",
          smsConsent: form.get("smsConsent") === "on",
          generalEmailOptIn: form.get("generalEmailOptIn") === "on",
        };

        try {
          const response = await fetch("/api/registrations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const result = (await response.json()) as {
            error?: string;
            status?: "confirmed" | "waitlisted";
            managementUrl?: string;
          };
          if (!response.ok || !result.status || !result.managementUrl) {
            setStatus({
              type: "error",
              message: result.error ?? "We could not complete the registration.",
            });
            return;
          }
          setStatus({
            type: "success",
            registrationStatus: result.status,
            managementUrl: result.managementUrl,
          });
        } catch {
          setStatus({
            type: "error",
            message: "We could not complete the registration. Check your connection and try again.",
          });
        }
      }}
    >
      <div>
        <SectionEyebrow>Parent or guardian</SectionEyebrow>
        <h2>Start with you.</h2>
        <div className="field-grid">
          <Field name="parentFirstName" label="First name" autoComplete="given-name" />
          <Field name="parentLastName" label="Last name" autoComplete="family-name" />
          <Field name="email" label="Email address" type="email" autoComplete="email" />
          <Field name="mobilePhone" label="Mobile number" type="tel" autoComplete="tel" />
          <Field name="emergencyContactName" label="Emergency contact name" />
          <Field name="emergencyContactPhone" label="Emergency contact phone" type="tel" />
        </div>

        <div className="registration-children">
          {(account?.savedChildren.length ?? 0) > 0 && (
            <div className="saved-child-picker registration-saved-children">
              <span>Quick add from your family account</span>
              <div>
                {account?.savedChildren.map((saved) => (
                  <button
                    type="button"
                    key={saved.id}
                    disabled={children.some(
                      (child) =>
                        child.firstName.toLowerCase() === saved.firstName.toLowerCase() &&
                        child.lastName.toLowerCase() === saved.lastName.toLowerCase() &&
                        child.birthDate === saved.birthDate,
                    )}
                    onClick={() => {
                      const draft: ChildDraft = {
                        key: nextKey,
                        firstName: saved.firstName,
                        lastName: saved.lastName,
                        birthDate: saved.birthDate,
                        statedAge: String(saved.age),
                        allergies: saved.allergies ?? "",
                        notes: saved.notes ?? "",
                      };
                      setChildren((current) => {
                        if (current.length === 1 && isBlankChild(current[0])) {
                          return [{ ...draft, key: current[0].key }];
                        }
                        return current.length < 10 ? [...current, draft] : current;
                      });
                      setNextKey((current) => current + 1);
                    }}
                  >
                    {saved.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {children.map((child, index) => (
            <section className="registration-child" key={child.key}>
              <div className="registration-child__heading">
                <div>
                  <SectionEyebrow>Participant {index + 1}</SectionEyebrow>
                  <h2>{index === 0 ? "Who is coming?" : "Another participant"}</h2>
                </div>
                {children.length > 1 && (
                  <button
                    className="text-link registration-child__remove"
                    type="button"
                    onClick={() => setChildren((current) => current.filter((item) => item.key !== child.key))}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="field-grid">
                <ChildField child={child} field="firstName" label="First name" setChildren={setChildren} />
                <ChildField child={child} field="lastName" label="Last name" setChildren={setChildren} />
                <ChildField child={child} field="birthDate" label="Birth date" type="date" setChildren={setChildren} />
                <ChildField child={child} field="statedAge" label="Age" type="number" setChildren={setChildren} />
                <ChildField child={child} field="allergies" label="Allergies" placeholder="None, or describe allergies" full setChildren={setChildren} />
                <label className="field field--full">
                  <span>Notes</span>
                  <textarea
                    className="form-control"
                    value={child.notes}
                    onChange={(event) => updateChild(setChildren, child.key, "notes", event.target.value)}
                    placeholder="Anything the Forge team should know"
                  />
                </label>
              </div>
            </section>
          ))}
        </div>
        <button
          className="choice registration-add-child"
          type="button"
          disabled={children.length >= 10}
          onClick={() => {
            setChildren((current) => [...current, newChild(nextKey)]);
            setNextKey((current) => current + 1);
          }}
        >
          + Add another child
        </button>
      </div>

      <aside className="panel registration-summary">
        <p className="eyebrow">{mode === "waitlist" ? "Waitlist request" : "Your reservation"}</p>
        <h3>{eventTitle}</h3>
        <div className="detail-list">
          <div><span>Children</span><strong>{children.length} {children.length === 1 ? "spot" : "spots"}</strong></div>
          <div><span>Available now</span><strong>{remaining}</strong></div>
          <div><span>Cost</span><strong>Free</strong></div>
        </div>
        {mode === "waitlist" && (
          <p className="registration-waitlist-note">
            Your family will only be offered seats when the entire request fits.
          </p>
        )}
        <label className="checkbox-row">
          <input type="checkbox" name="waiverAccepted" required />
          <span>
            I agree to the <Link className="text-link" href="/waiver" target="_blank">participation waiver</Link>,
            emergency medical authorization, and photo and media release for every child.
          </span>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" name="smsConsent" />
          <span>{RSVP_SMS_CONSENT_TEXT}</span>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" name="generalEmailOptIn" />
          <span>Also add me to general Forge email updates.</span>
        </label>
        {status.type === "error" && (
          <p className="form-status form-status--error" role="alert">{status.message}</p>
        )}
        <button
          className="button button--red registration-submit"
          type="submit"
          disabled={status.type === "submitting"}
        >
          {status.type === "submitting"
            ? "Saving registration…"
            : mode === "waitlist"
              ? "Join the waitlist"
              : "Complete registration"}
        </button>
        <p className="registration-fine-print">
          No account or password required. Your email connects this RSVP to your Forge account
          whenever you choose to sign in.
        </p>
      </aside>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className="form-control" name={name} type={type} autoComplete={autoComplete} required />
    </label>
  );
}

function ChildField({
  child,
  field,
  label,
  type = "text",
  placeholder,
  full,
  setChildren,
}: {
  child: ChildDraft;
  field: keyof Omit<ChildDraft, "key" | "notes">;
  label: string;
  type?: string;
  placeholder?: string;
  full?: boolean;
  setChildren: React.Dispatch<React.SetStateAction<ChildDraft[]>>;
}) {
  return (
    <label className={`field ${full ? "field--full" : ""}`}>
      <span>{label}</span>
      <input
        className="form-control"
        type={type}
        min={type === "number" ? 1 : undefined}
        max={type === "number" ? 21 : undefined}
        value={child[field]}
        placeholder={placeholder}
        required={!["allergies"].includes(field)}
        onChange={(event) => updateChild(setChildren, child.key, field, event.target.value)}
      />
    </label>
  );
}

function updateChild(
  setChildren: React.Dispatch<React.SetStateAction<ChildDraft[]>>,
  key: number,
  field: keyof Omit<ChildDraft, "key">,
  value: string,
) {
  setChildren((current) =>
    current.map((child) => child.key === key ? { ...child, [field]: value } : child),
  );
}

function newChild(key: number): ChildDraft {
  return {
    key,
    firstName: "",
    lastName: "",
    birthDate: "",
    statedAge: "",
    allergies: "",
    notes: "",
  };
}

function isBlankChild(child: ChildDraft) {
  return !child.firstName && !child.lastName && !child.birthDate && !child.statedAge;
}
