"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SectionEyebrow } from "../../components";

type ChildDraft = {
  firstName: string;
  lastName: string;
  birthDate: string;
  statedAge: number;
  allergies?: string;
  notes?: string;
};

type ManagedChild = Omit<ChildDraft, "statedAge"> & {
  id: string;
  name: string;
  age: number;
  status: "active" | "cancelled";
};

const emptyChild: ChildDraft = {
  firstName: "",
  lastName: "",
  birthDate: "",
  statedAge: 10,
  allergies: "",
  notes: "",
};

export function ManageRegistration({
  token,
  initialStatus,
  registeredChildren,
}: {
  token: string;
  initialStatus: "confirmed" | "waitlisted" | "offered" | "cancelled";
  registeredChildren: ManagedChild[];
}) {
  const router = useRouter();
  const activeChildren = useMemo(
    () => registeredChildren.filter((child) => child.status === "active"),
    [registeredChildren],
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ChildDraft>(emptyChild);
  const [showAdd, setShowAdd] = useState(false);
  const [addDraft, setAddDraft] = useState<ChildDraft>(emptyChild);
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [status, setStatus] = useState<
    { type: "idle" } | { type: "submitting" } | { type: "success"; message: string } | { type: "error"; message: string }
  >({ type: "idle" });
  const canManage = initialStatus !== "cancelled";

  async function saveParticipant(method: "POST" | "PATCH", body: object) {
    const response = await fetch("/api/registrations/children", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managementToken: token, ...body }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(result.error ?? "We could not update this participant.");
  }

  return (
    <section className="panel manage-registration-children">
      <div className="manage-participant-heading">
        <div>
          <SectionEyebrow>Participants</SectionEyebrow>
          <h2>Manage who is coming.</h2>
        </div>
        {canManage && (
          <button
            className="button button--outline-dark button--small"
            type="button"
            onClick={() => {
              setShowAdd((current) => !current);
              setStatus({ type: "idle" });
            }}
          >
            {showAdd ? "Close" : "+ Add a child"}
          </button>
        )}
      </div>
      <p>Edit participant details or select only the children who need to cancel.</p>

      {showAdd && (
        <div className="participant-editor">
          <h3>Add a participant</h3>
          <ChildFields draft={addDraft} onChange={setAddDraft} />
          <label className="checkbox-row participant-waiver">
            <input type="checkbox" checked={waiverAccepted} onChange={(event) => setWaiverAccepted(event.target.checked)} />
            <span>I agree to The Forge participation terms, waiver, and photo release for this child.</span>
          </label>
          <button
            className="button button--red"
            type="button"
            disabled={status.type === "submitting" || !waiverAccepted}
            onClick={async () => {
              setStatus({ type: "submitting" });
              try {
                await saveParticipant("POST", { children: [normalizedDraft(addDraft)], waiverAccepted });
                setAddDraft(emptyChild);
                setWaiverAccepted(false);
                setShowAdd(false);
                setStatus({ type: "success", message: "Participant added to this reservation." });
                router.refresh();
              } catch (error) {
                setStatus({ type: "error", message: error instanceof Error ? error.message : "We could not add this participant." });
              }
            }}
          >
            {status.type === "submitting" ? "Adding participant…" : "Add participant"}
          </button>
        </div>
      )}

      <div className="managed-child-list">
        {registeredChildren.map((child) => (
          <div className={`managed-child-card ${child.status === "cancelled" ? "is-cancelled" : ""}`} key={child.id}>
            <label className="managed-child">
              <input
                type="checkbox"
                aria-label={`Select ${child.name} for cancellation`}
                checked={selected.includes(child.id)}
                disabled={child.status === "cancelled" || !canManage || status.type === "submitting"}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked ? [...current, child.id] : current.filter((id) => id !== child.id),
                  )
                }
              />
              <span><strong>{child.name}</strong><small>Age {child.age} · Born {formatBirthDate(child.birthDate)}</small></span>
              <em>{child.status === "cancelled" ? "Cancelled" : "Active"}</em>
            </label>
            {child.status === "active" && canManage && (
              <button
                className="participant-edit-link"
                type="button"
                onClick={() => {
                  if (editingId === child.id) return setEditingId(null);
                  setEditingId(child.id);
                  setEditDraft({
                    firstName: child.firstName,
                    lastName: child.lastName,
                    birthDate: child.birthDate,
                    statedAge: child.age,
                    allergies: child.allergies ?? "",
                    notes: child.notes ?? "",
                  });
                  setStatus({ type: "idle" });
                }}
              >
                {editingId === child.id ? "Close editor" : "Edit details"}
              </button>
            )}
            {editingId === child.id && (
              <div className="participant-editor participant-editor--inline">
                <ChildFields draft={editDraft} onChange={setEditDraft} />
                <button
                  className="button button--dark button--small"
                  type="button"
                  disabled={status.type === "submitting"}
                  onClick={async () => {
                    setStatus({ type: "submitting" });
                    try {
                      await saveParticipant("PATCH", {
                        registrationChildId: child.id,
                        child: normalizedDraft(editDraft),
                      });
                      setEditingId(null);
                      setStatus({ type: "success", message: `${editDraft.firstName.trim()}'s details were updated.` });
                      router.refresh();
                    } catch (error) {
                      setStatus({ type: "error", message: error instanceof Error ? error.message : "We could not update this participant." });
                    }
                  }}
                >
                  {status.type === "submitting" ? "Saving…" : "Save details"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {status.type === "error" && <p className="form-status form-status--error">{status.message}</p>}
      {status.type === "success" && <p className="form-status form-status--success">{status.message}</p>}
      {activeChildren.length > 0 && canManage && (
        <button
          className="button button--dark manage-cancel-button"
          type="button"
          disabled={selected.length === 0 || status.type === "submitting"}
          onClick={async () => {
            if (!window.confirm(`Cancel ${selected.length} selected ${selected.length === 1 ? "child" : "children"} from this event?`)) return;
            setStatus({ type: "submitting" });
            try {
              const response = await fetch("/api/registrations/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ managementToken: token, childIds: selected }),
              });
              const result = (await response.json()) as { error?: string; cancelledChildren?: number };
              if (!response.ok) throw new Error(result.error ?? "We could not update the registration.");
              setSelected([]);
              setStatus({
                type: "success",
                message: `${result.cancelledChildren ?? 0} ${result.cancelledChildren === 1 ? "child was" : "children were"} cancelled. The seats have been returned.`,
              });
              router.refresh();
            } catch (error) {
              setStatus({ type: "error", message: error instanceof Error ? error.message : "We could not update the registration." });
            }
          }}
        >
          {status.type === "submitting" ? "Returning seats…" : "Cancel selected participants"}
        </button>
      )}
    </section>
  );
}

function ChildFields({ draft, onChange }: { draft: ChildDraft; onChange: (draft: ChildDraft) => void }) {
  return (
    <div className="field-grid participant-fields">
      <label className="field"><span>First name</span><input required value={draft.firstName} onChange={(e) => onChange({ ...draft, firstName: e.target.value })} /></label>
      <label className="field"><span>Last name</span><input required value={draft.lastName} onChange={(e) => onChange({ ...draft, lastName: e.target.value })} /></label>
      <label className="field"><span>Birth date</span><input required type="date" value={draft.birthDate} onChange={(e) => onChange({ ...draft, birthDate: e.target.value })} /></label>
      <label className="field"><span>Age</span><input required type="number" min="1" max="21" value={draft.statedAge} onChange={(e) => onChange({ ...draft, statedAge: Number(e.target.value) })} /></label>
      <label className="field field--full"><span>Allergies</span><input value={draft.allergies ?? ""} placeholder="None, or list allergies" onChange={(e) => onChange({ ...draft, allergies: e.target.value })} /></label>
      <label className="field field--full"><span>Notes</span><textarea value={draft.notes ?? ""} placeholder="Anything the Forge team should know" onChange={(e) => onChange({ ...draft, notes: e.target.value })} /></label>
    </div>
  );
}

function normalizedDraft(draft: ChildDraft): ChildDraft {
  return {
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    birthDate: draft.birthDate,
    statedAge: Number(draft.statedAge),
    allergies: draft.allergies?.trim() || undefined,
    notes: draft.notes?.trim() || undefined,
  };
}

function formatBirthDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })
    .format(new Date(year, month - 1, day));
}
