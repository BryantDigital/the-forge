"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SectionEyebrow } from "../../components";

type ManagedChild = {
  id: string;
  name: string;
  age: number;
  status: "active" | "cancelled";
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
  const [status, setStatus] = useState<
    { type: "idle" } | { type: "submitting" } | { type: "success"; message: string } | { type: "error"; message: string }
  >({ type: "idle" });

  return (
    <section className="panel manage-registration-children">
      <SectionEyebrow>Participants</SectionEyebrow>
      <h2>Cancel only who needs to cancel.</h2>
      <p>Select one or more children. Their seats return to the event immediately.</p>
      <div className="managed-child-list">
        {registeredChildren.map((child) => (
          <label className={`managed-child ${child.status === "cancelled" ? "is-cancelled" : ""}`} key={child.id}>
            <input
              type="checkbox"
              checked={selected.includes(child.id)}
              disabled={child.status === "cancelled" || initialStatus === "cancelled" || status.type === "submitting"}
              onChange={(event) =>
                setSelected((current) =>
                  event.target.checked
                    ? [...current, child.id]
                    : current.filter((id) => id !== child.id),
                )
              }
            />
            <span><strong>{child.name}</strong><small>Age {child.age}</small></span>
            <em>{child.status === "cancelled" ? "Cancelled" : "Active"}</em>
          </label>
        ))}
      </div>
      {status.type === "error" && <p className="form-status form-status--error">{status.message}</p>}
      {status.type === "success" && <p className="form-status form-status--success">{status.message}</p>}
      {activeChildren.length > 0 && initialStatus !== "cancelled" && (
        <button
          className="button button--dark manage-cancel-button"
          type="button"
          disabled={selected.length === 0 || status.type === "submitting"}
          onClick={async () => {
            if (!window.confirm(`Cancel ${selected.length} selected ${selected.length === 1 ? "child" : "children"} from this event?`)) {
              return;
            }
            setStatus({ type: "submitting" });
            try {
              const response = await fetch("/api/registrations/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ managementToken: token, childIds: selected }),
              });
              const result = (await response.json()) as {
                error?: string;
                cancelledChildren?: number;
              };
              if (!response.ok) {
                setStatus({ type: "error", message: result.error ?? "We could not update the registration." });
                return;
              }
              setSelected([]);
              setStatus({
                type: "success",
                message: `${result.cancelledChildren ?? 0} ${result.cancelledChildren === 1 ? "child was" : "children were"} cancelled. The seats have been returned.`,
              });
              router.refresh();
            } catch {
              setStatus({ type: "error", message: "We could not update the registration. Try again." });
            }
          }}
        >
          {status.type === "submitting" ? "Returning seats…" : "Cancel selected participants"}
        </button>
      )}
    </section>
  );
}
