"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type Account = NonNullable<
  ReturnType<typeof useQuery<typeof api.registrations.getMyAccount>>
>;

type ChildDraft = {
  firstName: string;
  lastName: string;
  birthDate: string;
  statedAge: number;
  allergies?: string;
  notes?: string;
};

const emptyChild: ChildDraft = {
  firstName: "",
  lastName: "",
  birthDate: "",
  statedAge: 10,
  allergies: "",
  notes: "",
};

export function HouseholdManager({ account }: { account: Account }) {
  const addChild = useMutation(api.households.addChildProfile);
  const updateChild = useMutation(api.households.updateChildProfile);
  const inviteAdult = useMutation(api.households.inviteAdult);
  const [editingChildId, setEditingChildId] = useState<Id<"children"> | "new" | null>(
    null,
  );
  const [childDraft, setChildDraft] = useState<ChildDraft>(emptyChild);
  const [inviteEmail, setInviteEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  function beginEdit(child: Account["savedChildren"][number]) {
    setEditingChildId(child.id);
    setChildDraft({
      firstName: child.firstName,
      lastName: child.lastName,
      birthDate: child.birthDate,
      statedAge: child.age,
      allergies: child.allergies ?? "",
      notes: child.notes ?? "",
    });
    setStatus(null);
  }

  async function saveChild() {
    setSaving(true);
    setStatus(null);
    try {
      const child = normalizedChild(childDraft);
      if (editingChildId === "new") {
        await addChild({ child });
        setStatus({
          type: "success",
          message: `${child.firstName} is now saved to your household.`,
        });
      } else if (editingChildId) {
        await updateChild({ childId: editingChildId, child });
        setStatus({
          type: "success",
          message: `${child.firstName}'s family profile was updated.`,
        });
      }
      setEditingChildId(null);
      setChildDraft(emptyChild);
    } catch (error) {
      setStatus({
        type: "error",
        message: cleanError(error, "We couldn't save this child profile."),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="family-dashboard" aria-label="Your household">
      <div className="family-dashboard__heading">
        <div>
          <p className="eyebrow">Your household</p>
          <h3>{account.household.parentName} family</h3>
          <p>
            Keep family information current once, then reuse it when you register
            for future Forge events.
          </p>
        </div>
        <button
          className="button button--red button--small"
          type="button"
          onClick={() => {
            setEditingChildId(editingChildId === "new" ? null : "new");
            setChildDraft(emptyChild);
            setStatus(null);
          }}
        >
          {editingChildId === "new" ? "Close" : "+ Add a child"}
        </button>
      </div>

      <div className="family-contact-strip">
        <div>
          <span>Primary contact</span>
          <strong>{account.household.parentName}</strong>
          <small>{account.household.email} · {formatPhone(account.household.mobilePhone)}</small>
        </div>
        <div>
          <span>Emergency contact</span>
          <strong>{account.household.emergencyContactName}</strong>
          <small>{formatPhone(account.household.emergencyContactPhone)}</small>
        </div>
        <div>
          <span>Family profiles</span>
          <strong>
            {account.savedChildren.length}{" "}
            {account.savedChildren.length === 1 ? "child" : "children"}
          </strong>
          <small>{account.members.length} connected or invited adults</small>
        </div>
      </div>

      {editingChildId === "new" && (
        <div className="family-editor">
          <div>
            <p className="eyebrow">New family profile</p>
            <h4>Add a child</h4>
          </div>
          <ChildFields draft={childDraft} onChange={setChildDraft} />
          <div className="family-editor__actions">
            <button
              className="button button--red button--small"
              type="button"
              disabled={saving}
              onClick={saveChild}
            >
              {saving ? "Saving…" : "Save child"}
            </button>
            <button
              className="choice"
              type="button"
              disabled={saving}
              onClick={() => setEditingChildId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="family-section-heading">
        <div>
          <p className="eyebrow">Children</p>
          <h4>Saved family profiles</h4>
        </div>
        <p>Profile changes apply to future registrations, not historical event rosters.</p>
      </div>

      {account.savedChildren.length > 0 ? (
        <div className="family-child-grid">
          {account.savedChildren.map((child) => (
            <article className="family-child-card" key={child.id}>
              <div className="family-child-card__top">
                <span aria-hidden="true">{initials(child.firstName, child.lastName)}</span>
                <div>
                  <h5>{child.name}</h5>
                  <p>Age {child.age} · Born {formatBirthDate(child.birthDate)}</p>
                </div>
                <button
                  className="family-edit-button"
                  type="button"
                  onClick={() =>
                    editingChildId === child.id
                      ? setEditingChildId(null)
                      : beginEdit(child)
                  }
                >
                  {editingChildId === child.id ? "Close" : "Edit"}
                </button>
              </div>
              <dl>
                <div>
                  <dt>Allergies</dt>
                  <dd>{child.allergies || "None listed"}</dd>
                </div>
                <div>
                  <dt>Notes</dt>
                  <dd>{child.notes || "No notes"}</dd>
                </div>
              </dl>
              {editingChildId === child.id && (
                <div className="family-editor family-editor--inline">
                  <ChildFields draft={childDraft} onChange={setChildDraft} />
                  <div className="family-editor__actions">
                    <button
                      className="button button--dark button--small"
                      type="button"
                      disabled={saving}
                      onClick={saveChild}
                    >
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      className="choice"
                      type="button"
                      disabled={saving}
                      onClick={() => setEditingChildId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="family-empty">
          <strong>No children saved yet.</strong>
          <p>Add a child once and their information will be ready for future RSVPs.</p>
        </div>
      )}

      <div className="family-adults">
        <div className="family-section-heading">
          <div>
            <p className="eyebrow">Parents and guardians</p>
            <h4>Share the family account</h4>
          </div>
          <p>Each adult signs in with their own verified email code.</p>
        </div>
        <div className="family-member-list">
          {account.members.map((member) => (
            <div className="family-member" key={member.id}>
              <span className="family-member__icon" aria-hidden="true">
                {member.status === "active" ? "✓" : "…"}
              </span>
              <div>
                <strong>{member.displayName}</strong>
                <small>{member.email}</small>
              </div>
              <em className={`account-status ${
                member.status === "invited" ? "account-status--waitlisted" : ""
              }`}>
                {member.status === "active"
                  ? member.role === "primary"
                    ? "Primary"
                    : "Connected"
                  : "Invitation sent"}
              </em>
            </div>
          ))}
        </div>
        <form
          className="family-invite-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            setStatus(null);
            try {
              await inviteAdult({ email: inviteEmail.trim() });
              setStatus({
                type: "success",
                message: `Invitation sent to ${inviteEmail.trim()}.`,
              });
              setInviteEmail("");
            } catch (error) {
              setStatus({
                type: "error",
                message: cleanError(error, "We couldn't send the invitation."),
              });
            } finally {
              setSaving(false);
            }
          }}
        >
          <label className="field">
            <span>Spouse or co-parent email</span>
            <input
              className="form-control"
              type="email"
              autoComplete="email"
              placeholder="parent@example.com"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              required
            />
          </label>
          <button className="button button--dark" type="submit" disabled={saving}>
            {saving ? "Sending…" : "Invite parent"}
          </button>
        </form>
        <p className="family-privacy-note">
          Only invite a parent or guardian who should be able to view and manage
          this household’s children and registrations.
        </p>
      </div>

      {status && (
        <p className={`form-status form-status--${status.type}`} aria-live="polite">
          {status.message}
        </p>
      )}
    </section>
  );
}

export function HouseholdSetup() {
  const createHousehold = useMutation(api.households.createMyHousehold);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  return (
    <section className="family-setup">
      <p className="eyebrow">Start your family account</p>
      <h3>Build your household.</h3>
      <p>
        No reservations are connected to this email yet. Add your family contact
        details now, or register for an event and your household will be created
        automatically.
      </p>
      <form
        className="field-grid"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          setStatus(null);
          const data = new FormData(event.currentTarget);
          try {
            await createHousehold({
              parentFirstName: String(data.get("parentFirstName") ?? ""),
              parentLastName: String(data.get("parentLastName") ?? ""),
              mobilePhone: String(data.get("mobilePhone") ?? ""),
              emergencyContactName: String(data.get("emergencyContactName") ?? ""),
              emergencyContactPhone: String(data.get("emergencyContactPhone") ?? ""),
            });
          } catch (error) {
            setStatus(cleanError(error, "We couldn't create your household."));
          } finally {
            setSaving(false);
          }
        }}
      >
        <FamilyField name="parentFirstName" label="First name" autoComplete="given-name" />
        <FamilyField name="parentLastName" label="Last name" autoComplete="family-name" />
        <FamilyField name="mobilePhone" label="Mobile number" type="tel" autoComplete="tel" />
        <FamilyField name="emergencyContactName" label="Emergency contact name" />
        <FamilyField name="emergencyContactPhone" label="Emergency contact phone" type="tel" />
        <button className="button button--red field--full" type="submit" disabled={saving}>
          {saving ? "Creating household…" : "Create family account"}
        </button>
      </form>
      {status && <p className="form-status form-status--error">{status}</p>}
    </section>
  );
}

function ChildFields({
  draft,
  onChange,
}: {
  draft: ChildDraft;
  onChange: (draft: ChildDraft) => void;
}) {
  return (
    <div className="field-grid participant-fields">
      <label className="field">
        <span>First name</span>
        <input
          required
          value={draft.firstName}
          onChange={(event) => onChange({ ...draft, firstName: event.target.value })}
        />
      </label>
      <label className="field">
        <span>Last name</span>
        <input
          required
          value={draft.lastName}
          onChange={(event) => onChange({ ...draft, lastName: event.target.value })}
        />
      </label>
      <label className="field">
        <span>Birth date</span>
        <input
          required
          type="date"
          value={draft.birthDate}
          onChange={(event) => onChange({ ...draft, birthDate: event.target.value })}
        />
      </label>
      <label className="field">
        <span>Age</span>
        <input
          required
          type="number"
          min="1"
          max="21"
          value={draft.statedAge}
          onChange={(event) =>
            onChange({ ...draft, statedAge: Number(event.target.value) })
          }
        />
      </label>
      <label className="field field--full">
        <span>Allergies</span>
        <input
          value={draft.allergies ?? ""}
          placeholder="None, or list allergies"
          onChange={(event) => onChange({ ...draft, allergies: event.target.value })}
        />
      </label>
      <label className="field field--full">
        <span>Notes</span>
        <textarea
          value={draft.notes ?? ""}
          placeholder="Anything the Forge team should know"
          onChange={(event) => onChange({ ...draft, notes: event.target.value })}
        />
      </label>
    </div>
  );
}

function FamilyField({
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
      <input
        className="form-control"
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
      />
    </label>
  );
}

function normalizedChild(draft: ChildDraft) {
  return {
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    birthDate: draft.birthDate,
    statedAge: Number(draft.statedAge),
    allergies: draft.allergies?.trim() || undefined,
    notes: draft.notes?.trim() || undefined,
  };
}

function cleanError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  return error.message.match(/Uncaught ConvexError:\s*([^\n]+)/)?.[1] ?? error.message;
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function formatBirthDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value;
}
