"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { SectionEyebrow } from "../../../components";

type ManagedChild = {
  id: Id<"registrationChildren">;
  name: string;
  age: number;
  status: "active" | "cancelled";
};

export function AccountRegistrationManager({
  registrationId,
  initialStatus,
  offerExpiresAt,
  registeredChildren,
}: {
  registrationId: Id<"registrations">;
  initialStatus: "confirmed" | "waitlisted" | "offered" | "cancelled";
  offerExpiresAt?: number;
  registeredChildren: ManagedChild[];
}) {
  const router = useRouter();
  const cancelChildren = useMutation(api.registrations.cancelMyChildren);
  const claimOffer = useMutation(api.registrations.claimMyOffer);
  const activeChildren = useMemo(
    () => registeredChildren.filter((child) => child.status === "active"),
    [registeredChildren],
  );
  const [selected, setSelected] = useState<Id<"registrationChildren">[]>([]);
  const [status, setStatus] = useState<
    { type: "idle" } |
    { type: "submitting" } |
    { type: "success"; message: string } |
    { type: "error"; message: string }
  >({ type: "idle" });

  return (
    <section className="panel manage-registration-children">
      {initialStatus === "offered" && (
        <div className="account-offer-callout">
          <SectionEyebrow>24-hour offer</SectionEyebrow>
          <h2>Your family’s seats are ready.</h2>
          <p>
            Claim the complete reservation
            {offerExpiresAt ? ` before ${formatExpiration(offerExpiresAt)}` : ""}.
          </p>
          <button
            className="button button--red"
            type="button"
            disabled={status.type === "submitting"}
            onClick={async () => {
              setStatus({ type: "submitting" });
              try {
                await claimOffer({ registrationId });
                setStatus({ type: "success", message: "Seats claimed. Your registration is confirmed." });
                router.refresh();
              } catch (error) {
                setStatus({
                  type: "error",
                  message: error instanceof Error ? error.message : "We could not claim these seats.",
                });
              }
            }}
          >
            {status.type === "submitting" ? "Claiming seats…" : "Claim all seats"}
          </button>
        </div>
      )}

      <SectionEyebrow>Participants</SectionEyebrow>
      <h2>Manage who is coming.</h2>
      <p>Select only the children who need to cancel. Their seats return immediately.</p>
      <div className="managed-child-list">
        {registeredChildren.map((child) => (
          <label
            className={`managed-child ${child.status === "cancelled" ? "is-cancelled" : ""}`}
            key={child.id}
          >
            <input
              type="checkbox"
              checked={selected.includes(child.id)}
              disabled={
                child.status === "cancelled" ||
                initialStatus === "cancelled" ||
                status.type === "submitting"
              }
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
            if (!window.confirm(
              `Cancel ${selected.length} selected ${selected.length === 1 ? "child" : "children"} from this event?`,
            )) return;
            setStatus({ type: "submitting" });
            try {
              const result = await cancelChildren({ registrationId, childIds: selected });
              setSelected([]);
              setStatus({
                type: "success",
                message: `${result.cancelledChildren} ${result.cancelledChildren === 1 ? "child was" : "children were"} cancelled. The seats have been returned.`,
              });
              router.refresh();
            } catch (error) {
              setStatus({
                type: "error",
                message: error instanceof Error ? error.message : "We could not update the registration.",
              });
            }
          }}
        >
          {status.type === "submitting" ? "Updating reservation…" : "Cancel selected participants"}
        </button>
      )}
    </section>
  );
}

function formatExpiration(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(timestamp);
}
