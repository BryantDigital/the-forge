"use client";

import { useAction, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";

export function SigningForm({
  token,
  tokenHash,
  signerName,
  consentText,
}: {
  token: string;
  tokenHash: string;
  signerName: string;
  consentText: string;
}) {
  const markViewed = useMutation(api.volunteers.markViewed);
  const sign = useAction(api.volunteerSignatures.sign);
  const [signatureText, setSignatureText] = useState("");
  const [electronicConsent, setElectronicConsent] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "signing" }
    | { type: "error"; message: string }
    | { type: "signed"; documentUrl: string | null }
  >({ type: "idle" });

  useEffect(() => {
    void markViewed({ tokenHash });
  }, [markViewed, tokenHash]);

  if (status.type === "signed") {
    return (
      <section className="signature-complete">
        <div className="donation-complete__mark" aria-hidden="true">✓</div>
        <p className="eyebrow">Agreement signed</p>
        <h2>You’re approved.</h2>
        <p>
          Your signed volunteer agreement has been saved. The Forge has also
          emailed you a copy and will contact you about the next opportunity to
          serve.
        </p>
        {status.documentUrl && (
          <a
            className="button button--red"
            href={status.documentUrl}
            target="_blank"
            rel="noreferrer"
          >
            Download signed PDF ↗
          </a>
        )}
      </section>
    );
  }

  return (
    <form
      className="signature-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setStatus({ type: "signing" });
        try {
          const result = await sign({
            token,
            signatureText,
            electronicConsentAccepted: electronicConsent,
            agreementAccepted,
            userAgent:
              typeof navigator === "undefined"
                ? undefined
                : navigator.userAgent,
          });
          setStatus({
            type: "signed",
            documentUrl: result.documentUrl ?? null,
          });
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) {
          setStatus({ type: "error", message: cleanError(error) });
        }
      }}
    >
      <div className="signature-consents">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={electronicConsent}
            onChange={(event) => setElectronicConsent(event.target.checked)}
            required
          />
          <span>{consentText}</span>
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={agreementAccepted}
            onChange={(event) => setAgreementAccepted(event.target.checked)}
            required
          />
          <span>
            I have read and agree to The Forge Volunteer Commitment &
            Acknowledgment shown above.
          </span>
        </label>
      </div>

      <label className="field signature-field">
        <span>Electronic signature</span>
        <small>
          Type your full legal name exactly as shown: <strong>{signerName}</strong>
        </small>
        <input
          className="form-control"
          value={signatureText}
          onChange={(event) => setSignatureText(event.target.value)}
          autoComplete="name"
          placeholder={signerName}
          required
        />
      </label>

      {status.type === "error" && (
        <p className="form-status form-status--error" role="alert">{status.message}</p>
      )}

      <button
        className="button button--red signature-submit"
        type="submit"
        disabled={
          status.type === "signing" ||
          !electronicConsent ||
          !agreementAccepted ||
          !signatureText.trim()
        }
      >
        {status.type === "signing" ? "Finalizing agreement…" : "Sign agreement"}
        <span aria-hidden="true">→</span>
      </button>
      <p className="signature-disclosure">
        After signing, the document cannot be edited. A finalized PDF and audit
        record will be retained by The Forge.
      </p>
    </form>
  );
}

function cleanError(error: unknown) {
  if (!(error instanceof Error)) return "The agreement could not be signed.";
  return (
    error.message.match(/Uncaught ConvexError:\s*([^\n]+)/)?.[1] ??
    "The agreement could not be signed. Please refresh and try again."
  );
}
