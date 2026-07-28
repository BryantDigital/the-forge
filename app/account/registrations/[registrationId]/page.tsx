import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { fetchAuthQuery } from "../../../../lib/auth-server";
import { ForgeFooter, ForgeHeader, SectionEyebrow } from "../../../components";
import { AccountRegistrationManager } from "./registration-manager";

export const metadata: Metadata = { title: "Manage Reservation" };

export default async function AccountRegistrationPage({
  params,
}: {
  params: Promise<{ registrationId: string }>;
}) {
  const { registrationId } = await params;
  const registration = await fetchAuthQuery(api.registrations.getMyRegistration, {
    registrationId: registrationId as Id<"registrations">,
  });
  if (!registration) notFound();

  return (
    <>
      <ForgeHeader />
      <main>
        <header className="interior-header account-manage-header">
          <div className="shell">
            <SectionEyebrow>{statusLabel(registration.status)}</SectionEyebrow>
            <h1>Your reservation.</h1>
            <p>{registration.event.title} · {formatDate(registration.event.startsAt)}</p>
          </div>
        </header>
        <section className="section section--interior">
          <div className="shell manage-registration-layout">
            <article className="panel manage-registration-summary">
              <SectionEyebrow>Event details</SectionEyebrow>
              <h2>{registration.event.title}</h2>
              <div className="detail-list">
                <div><span>Status</span><strong>{statusLabel(registration.status)}</strong></div>
                <div><span>Active children</span><strong>{registration.seatCount}</strong></div>
                <div><span>Date</span><strong>{formatDate(registration.event.startsAt)}</strong></div>
                <div><span>Location</span><strong>{formatLocation(registration.event)}</strong></div>
                <div><span>Parent</span><strong>{registration.household.parentName}</strong></div>
                <div><span>Mobile</span><strong>{formatPhone(registration.household.mobilePhone)}</strong></div>
              </div>
              {registration.status === "waitlisted" && (
                <p className="registration-waitlist-note">
                  Waitlist position {registration.waitlistPosition ?? "pending"}. We’ll offer seats
                  when your entire current request fits.
                </p>
              )}
            </article>
            <AccountRegistrationManager
              registrationId={registration.registrationId}
              initialStatus={registration.status}
              offerExpiresAt={registration.offerExpiresAt}
              registeredChildren={registration.children}
            />
          </div>
          <div className="shell manage-registration-footer account-manage-footer">
            <Link className="text-link" href="/account">← Back to family account</Link>
            <Link className="text-link" href={`/events/${registration.event.slug}`}>
              View event details →
            </Link>
          </div>
        </section>
      </main>
      <ForgeFooter />
    </>
  );
}

function statusLabel(status: "confirmed" | "waitlisted" | "offered" | "cancelled") {
  if (status === "offered") return "Seats ready to claim";
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

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (digits.length !== 10) return phone;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
