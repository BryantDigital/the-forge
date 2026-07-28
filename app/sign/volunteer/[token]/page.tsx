import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { ForgeFooter, ForgeHeader } from "../../../components";
import { hashSecureToken } from "../../../../lib/secure-tokens";
import { SigningForm } from "./signing-form";

export const metadata: Metadata = {
  title: "Volunteer Agreement",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function VolunteerSigningPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tokenHash = await hashSecureToken(token);
  const request = await fetchQuery(api.volunteers.getSigningRequest, {
    tokenHash,
  }).catch(() => null);

  return (
    <>
      <ForgeHeader />
      <main className="signature-page">
        {!request ? (
          <SigningUnavailable
            title="Signing link unavailable"
            copy="This link is invalid or no longer available. Contact The Forge if you need a new agreement."
          />
        ) : request.status === "signed" ? (
          <section className="shell signature-complete signature-complete--page">
            <div className="donation-complete__mark" aria-hidden="true">✓</div>
            <p className="eyebrow">Agreement complete</p>
            <h1>You’re approved.</h1>
            <p>
              This agreement was signed {request.signedAt ? formatDate(request.signedAt) : ""}.
            </p>
            {request.documentUrl && (
              <a
                className="button button--red"
                href={request.documentUrl}
                target="_blank"
                rel="noreferrer"
              >
                Download signed PDF ↗
              </a>
            )}
          </section>
        ) : request.status !== "pending" ? (
          <SigningUnavailable
            title={request.status === "expired" ? "This link has expired" : "Agreement unavailable"}
            copy="Contact The Forge and ask for a new volunteer signing link."
          />
        ) : (
          <div className="shell signature-layout">
            <header className="signature-heading">
              <p className="eyebrow">Secure volunteer agreement</p>
              <h1>{request.title}</h1>
              <p>
                Prepared for <strong>{request.signerName}</strong> · Version{" "}
                {request.templateVersion}
              </p>
            </header>

            <article className="signature-document">
              {parseSections(request.body).map((section) => (
                <section key={section.heading}>
                  <h2>{section.heading}</h2>
                  <p>{section.text}</p>
                </section>
              ))}
            </article>

            <SigningForm
              token={token}
              tokenHash={tokenHash}
              signerName={request.signerName}
              consentText={request.electronicConsentText}
            />
          </div>
        )}
      </main>
      <ForgeFooter />
    </>
  );
}

function SigningUnavailable({ title, copy }: { title: string; copy: string }) {
  return (
    <section className="shell signature-unavailable">
      <p className="eyebrow">Volunteer agreement</p>
      <h1>{title}</h1>
      <p>{copy}</p>
      <a className="button button--red" href="mailto:info@forgeva.com">
        Contact The Forge
      </a>
    </section>
  );
}

function parseSections(body: string) {
  return body
    .split(/\n\n+/)
    .map((block) => {
      const [heading, ...rest] = block.split("\n");
      return { heading, text: rest.join(" ") };
    });
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    dateStyle: "long",
    timeStyle: "short",
  }).format(timestamp);
}
