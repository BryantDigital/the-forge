"use client";

import { useAction, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function VolunteerReviewActions({
  submissionId,
  status,
}: {
  submissionId: Id<"volunteerSubmissions">;
  status: string;
}) {
  const accept = useAction(api.volunteers.accept);
  const deny = useMutation(api.volunteers.deny);
  const router = useRouter();
  const [showDenial, setShowDenial] = useState(false);
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState<"accept" | "deny" | null>(null);
  const [message, setMessage] = useState("");

  if (status === "approved") {
    return <p className="form-status form-status--success">This volunteer is approved.</p>;
  }
  if (status === "pending") {
    return (
      <div className="volunteer-review-actions">
        {message && <p className="form-status form-status--error">{message}</p>}
        <p className="form-status form-status--success">
          Accepted. The volunteer agreement is pending signature.
        </p>
        <button
          className="choice"
          type="button"
          disabled={working !== null}
          onClick={async () => {
            if (!window.confirm("Revoke the old signing link and email a new one?")) return;
            setWorking("accept");
            setMessage("");
            try {
              const result = await accept({ submissionId });
              if (!result.emailSent) {
                setMessage("A new request was created, but the email could not be delivered.");
              }
              router.refresh();
            } catch (error) {
              setMessage(cleanError(error));
            } finally {
              setWorking(null);
            }
          }}
        >
          {working === "accept" ? "Sending new link…" : "Resend signing link"}
        </button>
      </div>
    );
  }

  return (
    <div className="volunteer-review-actions">
      {message && <p className="form-status form-status--error">{message}</p>}
      {showDenial ? (
        <div className="volunteer-denial-panel">
          <label className="field">
            <span>Internal denial reason (optional)</span>
            <textarea
              className="form-control"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={1_000}
            />
          </label>
          <div className="admin-title__actions">
            <button className="choice" type="button" onClick={() => setShowDenial(false)}>
              Cancel
            </button>
            <button
              className="button button--dark"
              type="button"
              disabled={working !== null}
              onClick={async () => {
                if (!window.confirm("Deny this volunteer application?")) return;
                setWorking("deny");
                setMessage("");
                try {
                  await deny({
                    submissionId,
                    reason: reason.trim() || undefined,
                  });
                  router.refresh();
                } catch (error) {
                  setMessage(cleanError(error));
                } finally {
                  setWorking(null);
                }
              }}
            >
              {working === "deny" ? "Denying…" : "Confirm denial"}
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-title__actions">
          <button className="choice" type="button" onClick={() => setShowDenial(true)}>
            Deny application
          </button>
          <button
            className="button button--red"
            type="button"
            disabled={working !== null}
            onClick={async () => {
              if (!window.confirm("Accept this application and email the volunteer agreement?")) {
                return;
              }
              setWorking("accept");
              setMessage("");
              try {
                const result = await accept({ submissionId });
                if (!result.emailSent) {
                  setMessage(
                    "The application is pending, but the signing email could not be delivered. Check the provider configuration before resending.",
                  );
                }
                router.refresh();
              } catch (error) {
                setMessage(cleanError(error));
              } finally {
                setWorking(null);
              }
            }}
          >
            {working === "accept" ? "Creating agreement…" : "Accept & send agreement"}
          </button>
        </div>
      )}
    </div>
  );
}

function cleanError(error: unknown) {
  if (!(error instanceof Error)) return "The application could not be updated.";
  return (
    error.message.match(/Uncaught ConvexError:\s*([^\n]+)/)?.[1] ??
    "The application could not be updated."
  );
}
