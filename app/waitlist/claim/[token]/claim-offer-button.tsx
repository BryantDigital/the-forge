"use client";

import Link from "next/link";
import { useState } from "react";

export function ClaimOfferButton({ token, eventSlug }: { token: string; eventSlug: string }) {
  const [status, setStatus] = useState<
    { type: "idle" } | { type: "submitting" } | { type: "success" } | { type: "error"; message: string }
  >({ type: "idle" });

  if (status.type === "success") {
    return (
      <div className="waitlist-claim-success">
        <p className="form-status form-status--success">Your seats are confirmed.</p>
        <Link className="button button--red" href={`/events/${eventSlug}`}>View event details</Link>
      </div>
    );
  }

  return (
    <>
      {status.type === "error" && <p className="form-status form-status--error">{status.message}</p>}
      <button
        className="button button--red"
        type="button"
        disabled={status.type === "submitting"}
        onClick={async () => {
          setStatus({ type: "submitting" });
          try {
            const response = await fetch("/api/registrations/claim", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ offerToken: token }),
            });
            const result = (await response.json()) as { error?: string };
            if (!response.ok) {
              setStatus({ type: "error", message: result.error ?? "This offer could not be claimed." });
              return;
            }
            setStatus({ type: "success" });
          } catch {
            setStatus({ type: "error", message: "This offer could not be claimed. Try again." });
          }
        }}
      >
        {status.type === "submitting" ? "Claiming seats…" : "Claim all seats"}
      </button>
    </>
  );
}
