import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { hashSecureToken } from "../../../../lib/secure-tokens";
import { ForgeFooter, ForgeHeader, SectionEyebrow } from "../../../components";
import { ClaimOfferButton } from "./claim-offer-button";

export const metadata: Metadata = { title: "Claim Waitlist Seats" };

export default async function ClaimWaitlistPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const offer = await fetchQuery(api.registrations.getOffer, {
    offerTokenHash: await hashSecureToken(token),
  });
  if (!offer) notFound();
  const active = offer.active;

  return (
    <>
      <ForgeHeader />
      <main>
        <header className="interior-header">
          <div className="shell">
            <SectionEyebrow>{active ? "24-hour waitlist offer" : "Offer unavailable"}</SectionEyebrow>
            <h1>{active ? "Your seats are ready." : "This offer has expired."}</h1>
            <p>{offer.eventTitle}</p>
          </div>
        </header>
        <section className="section section--interior">
          <div className="shell panel waitlist-claim-card">
            {active ? (
              <>
                <h2>Claim {offer.seatCount} {offer.seatCount === 1 ? "seat" : "seats"}.</h2>
                <p>
                  Enough room opened for your entire family request. Claim before{" "}
                  <strong>{formatExpiration(offer.offerExpiresAt!)}</strong>.
                </p>
                <ClaimOfferButton token={token} eventSlug={offer.eventSlug} />
              </>
            ) : (
              <p>The seats have been released to the next eligible family on the waitlist.</p>
            )}
          </div>
        </section>
      </main>
      <ForgeFooter />
    </>
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
