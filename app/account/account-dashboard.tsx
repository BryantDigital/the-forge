"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";
import { HouseholdManager, HouseholdSetup } from "./household-manager";

export function AccountDashboard() {
  const account = useQuery(api.registrations.getMyAccount);
  const connectHousehold = useMutation(api.registrations.connectMyHousehold);
  const connectionStarted = useRef(false);

  useEffect(() => {
    if (connectionStarted.current) return;
    connectionStarted.current = true;
    void connectHousehold();
  }, [connectHousehold]);

  if (account === undefined) {
    return (
      <section className="account-registrations" aria-busy="true">
        <div className="account-section-heading">
          <div>
            <p className="eyebrow">Family registrations</p>
            <h3>Loading your events…</h3>
          </div>
        </div>
      </section>
    );
  }

  if (!account) {
    return (
      <HouseholdSetup />
    );
  }

  const upcoming = account.registrations.filter(
    (registration) => registration.isUpcoming && registration.status !== "cancelled",
  );
  const history = account.registrations.filter(
    (registration) => !registration.isUpcoming || registration.status === "cancelled",
  );

  return (
    <>
      <HouseholdManager account={account} />
      <section className="account-registrations">
        <div className="account-section-heading">
          <div>
            <p className="eyebrow">Upcoming events</p>
            <h3>Your family’s next steps.</h3>
          </div>
          <Link className="text-link" href="/events">
            Browse events →
          </Link>
        </div>

        {upcoming.length > 0 ? (
          <div className="account-event-list">
            {upcoming.map((registration) => (
              <RegistrationCard key={registration.id} registration={registration} />
            ))}
          </div>
        ) : (
          <div className="account-empty-state">
            <strong>No upcoming reservations.</strong>
            <p>When you register with {account.household.email}, the event will show here.</p>
            <Link className="text-link" href="/events">See upcoming events →</Link>
          </div>
        )}

        {history.length > 0 && (
          <details className="account-history">
            <summary>Past and cancelled events ({history.length})</summary>
            <div className="account-event-list">
              {history.map((registration) => (
                <RegistrationCard key={registration.id} registration={registration} compact />
              ))}
            </div>
          </details>
        )}
      </section>
    </>
  );
}

type AccountRegistration = NonNullable<
  ReturnType<typeof useQuery<typeof api.registrations.getMyAccount>>
>["registrations"][number];

function RegistrationCard({
  registration,
  compact = false,
}: {
  registration: AccountRegistration;
  compact?: boolean;
}) {
  const activeChildren = registration.children.filter((child) => child.status === "active");
  return (
    <article className={`account-event-card ${compact ? "account-event-card--compact" : ""}`}>
      <div className="account-event-card__date">
        <span>{formatMonth(registration.event.startsAt)}</span>
        <strong>{formatDay(registration.event.startsAt)}</strong>
      </div>
      <div className="account-event-card__body">
        <div className="account-event-card__title">
          <div>
            <span className={`account-status account-status--${registration.status}`}>
              {statusLabel(registration.status)}
            </span>
            <h4>{registration.event.title}</h4>
          </div>
          <Link
            className="button button--dark account-manage-button"
            href={`/account/registrations/${registration.id}`}
          >
            Manage <span aria-hidden="true">→</span>
          </Link>
        </div>
        <p className="account-event-card__meta">
          {formatDateTime(registration.event.startsAt)} · {registration.event.locationName},{" "}
          {registration.event.city}
        </p>
        <p className="account-event-card__children">
          <strong>{activeChildren.length} {activeChildren.length === 1 ? "child" : "children"}:</strong>{" "}
          {activeChildren.map((child) => child.name).join(", ") || "No active participants"}
        </p>
        {registration.status === "waitlisted" && (
          <p className="account-event-card__notice">
            Waitlist position {registration.waitlistPosition ?? "pending"}. We’ll contact you when
            the full request fits.
          </p>
        )}
        {registration.status === "offered" && (
          <p className="account-event-card__notice account-event-card__notice--urgent">
            Seats are being held for your family. Open this reservation to claim them.
          </p>
        )}
      </div>
    </article>
  );
}

function statusLabel(status: AccountRegistration["status"]) {
  if (status === "offered") return "Action required";
  if (status === "waitlisted") return "Waitlisted";
  if (status === "cancelled") return "Cancelled";
  return "Confirmed";
}

function formatMonth(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
  }).format(timestamp);
}

function formatDay(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    day: "numeric",
  }).format(timestamp);
}

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}
