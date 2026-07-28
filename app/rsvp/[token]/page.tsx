import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { hashSecureToken } from "../../../lib/secure-tokens";
import { ForgeFooter, ForgeHeader, SectionEyebrow } from "../../components";
import { ManageRegistration } from "./manage-registration";

export const metadata: Metadata = { title: "Manage Registration" };

export default async function ManageRegistrationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const registration = await fetchQuery(api.registrations.getManaged, {
    managementTokenHash: await hashSecureToken(token),
  });
  if (!registration) notFound();

  return (
    <>
      <ForgeHeader />
      <main>
        <header className="interior-header">
          <div className="shell">
            <SectionEyebrow>{statusLabel(registration.status)}</SectionEyebrow>
            <h1>Manage registration.</h1>
            <p>{registration.event.title} · {formatDate(registration.event.startsAt)}</p>
          </div>
        </header>
        <section className="section section--interior">
          <div className="shell manage-registration-layout">
            <article className="panel manage-registration-summary">
              <SectionEyebrow>Family registration</SectionEyebrow>
              <h2>{registration.household.parentName}</h2>
              <div className="detail-list">
                <div><span>Status</span><strong>{statusLabel(registration.status)}</strong></div>
                <div><span>Active children</span><strong>{registration.seatCount}</strong></div>
                <div><span>Email</span><strong>{registration.household.email}</strong></div>
                <div><span>Mobile</span><strong>{registration.household.mobilePhone}</strong></div>
                <div><span>Location</span><strong>{formatLocation(registration.event)}</strong></div>
              </div>
              {registration.status === "waitlisted" && (
                <p className="registration-waitlist-note">
                  Waitlist position {registration.waitlistPosition ?? "pending"}. We’ll only offer
                  seats when your entire current request fits.
                </p>
              )}
            </article>
            <ManageRegistration
              token={token}
              initialStatus={registration.status}
              registeredChildren={registration.children}
            />
          </div>
          <div className="shell manage-registration-footer">
            <Link className="text-link" href={`/events/${registration.event.slug}`}>
              ← Return to event
            </Link>
          </div>
        </section>
      </main>
      <ForgeFooter />
    </>
  );
}

function statusLabel(status: "confirmed" | "waitlisted" | "offered" | "cancelled") {
  if (status === "offered") return "Seats offered";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function formatLocation(event: {
  locationName: string;
  addressLine1?: string;
  city: string;
  state: string;
  postalCode: string;
}) {
  return [
    event.locationName,
    event.addressLine1,
    `${event.city}, ${event.state} ${event.postalCode}`,
  ].filter(Boolean).join(" · ");
}
