"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function VolunteerAccessActions({
  submissionId,
  accessStatus,
}: {
  submissionId: Id<"volunteerSubmissions">;
  accessStatus?: "active" | "revoked";
}) {
  const setAccess = useMutation(api.volunteerPortal.setAccess);
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const active = accessStatus === "active";

  return (
    <div className="volunteer-access-admin">
      <div>
        <span>Volunteer dashboard</span>
        <strong>{active ? "Access active" : accessStatus === "revoked" ? "Access revoked" : "Not activated"}</strong>
        <p>
          {active
            ? "This volunteer can view opportunities and join event rosters."
            : "This volunteer cannot open the volunteer dashboard or join events."}
        </p>
      </div>
      {message && <p className="form-status form-status--error">{message}</p>}
      <button
        className={active ? "choice" : "button button--dark button--small"}
        type="button"
        disabled={working}
        onClick={async () => {
          if (
            active &&
            !window.confirm(
              "Revoke this volunteer’s dashboard access and remove them from future volunteer rosters?",
            )
          ) {
            return;
          }
          setWorking(true);
          setMessage("");
          try {
            await setAccess({
              volunteerSubmissionId: submissionId,
              enabled: !active,
            });
            router.refresh();
          } catch (error) {
            setMessage(cleanError(error));
          } finally {
            setWorking(false);
          }
        }}
      >
        {working
          ? "Updating access…"
          : active
            ? "Revoke volunteer access"
            : "Restore volunteer access"}
      </button>
    </div>
  );
}

function cleanError(error: unknown) {
  if (!(error instanceof Error)) return "Volunteer access could not be updated.";
  return (
    error.message.match(/Uncaught ConvexError:\s*([^\n]+)/)?.[1] ??
    "Volunteer access could not be updated."
  );
}
