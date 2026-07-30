"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { authClient } from "../../lib/auth-client";

export function VolunteerDashboard() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const connectVolunteer = useMutation(api.volunteerPortal.connectMyVolunteer);
  const dashboard = useQuery(
    api.volunteerPortal.getMyDashboard,
    session?.user ? {} : "skip",
  );
  const connectStarted = useRef(false);

  useEffect(() => {
    if (!session?.user || connectStarted.current) return;
    connectStarted.current = true;
    void connectVolunteer();
  }, [connectVolunteer, session?.user]);

  if (sessionPending) {
    return <PortalMessage eyebrow="Secure access" title="Opening your dashboard…" />;
  }
  if (!session?.user) {
    return (
      <PortalMessage
        eyebrow="Volunteer login"
        title="Sign in to see where you can serve."
        copy="Use the same email address as your approved volunteer application."
      >
        <Link className="button button--red" href="/account?returnTo=/serve">
          Login with email code →
        </Link>
      </PortalMessage>
    );
  }
  if (dashboard === undefined) {
    return <PortalMessage eyebrow="Volunteer access" title="Loading upcoming events…" />;
  }
  if (!dashboard) {
    return (
      <PortalMessage
        eyebrow="Volunteer access"
        title="No approved volunteer role found."
        copy="Volunteer access appears after your application is approved and your agreement is signed. Make sure you signed in with the same email used on your application."
      >
        <Link className="button button--dark" href="/volunteer">
          View volunteer application
        </Link>
      </PortalMessage>
    );
  }
  if (dashboard.status === "revoked") {
    return (
      <PortalMessage
        eyebrow="Access unavailable"
        title="Your volunteer access is not active."
        copy="Contact a Forge administrator if you believe this needs to be reviewed."
      />
    );
  }

  const committed = dashboard.events.filter((event) => event.commitment);
  return (
    <div className="volunteer-portal">
      <section className="volunteer-portal-welcome">
        <div>
          <p className="eyebrow">Approved volunteer</p>
          <h2>Welcome, {dashboard.volunteer.name}.</h2>
          <p>
            Your signed agreement is on file. Choose an upcoming event below to
            let Forge leadership know you can serve.
          </p>
        </div>
        <div className="volunteer-portal-role-card">
          <span>Approved service areas</span>
          <strong>{dashboard.volunteer.roles.join(" · ")}</strong>
        </div>
      </section>

      {committed.length > 0 && (
        <section className="volunteer-commitment-summary">
          <p className="eyebrow">You’re on the roster</p>
          <h3>
            {committed.length} upcoming{" "}
            {committed.length === 1 ? "commitment" : "commitments"}
          </h3>
          <p>Forge leadership can now see you on each event’s volunteer roster.</p>
        </section>
      )}

      <div className="volunteer-portal-heading">
        <div>
          <p className="eyebrow">Upcoming opportunities</p>
          <h3>Where can you serve?</h3>
        </div>
        <span>{dashboard.events.length} upcoming events</span>
      </div>

      {dashboard.events.length > 0 ? (
        <div className="volunteer-event-grid">
          {dashboard.events.map((event) => (
            <VolunteerEventCard event={event} key={event.id} />
          ))}
        </div>
      ) : (
        <div className="family-empty">
          <strong>No upcoming events are published yet.</strong>
          <p>Check back soon. New opportunities will appear here automatically.</p>
        </div>
      )}
    </div>
  );
}

type VolunteerEvent = NonNullable<
  ReturnType<typeof useQuery<typeof api.volunteerPortal.getMyDashboard>>
>["events"][number];

function VolunteerEventCard({ event }: { event: VolunteerEvent }) {
  const commit = useMutation(api.volunteerPortal.commitToEvent);
  const withdraw = useMutation(api.volunteerPortal.withdrawFromEvent);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const isCommitted = Boolean(event.commitment);

  async function updateCommitment() {
    if (
      isCommitted &&
      !window.confirm(`Remove yourself from the volunteer roster for ${event.title}?`)
    ) {
      return;
    }
    setWorking(true);
    setMessage("");
    try {
      if (isCommitted) {
        await withdraw({ eventId: event.id });
      } else {
        await commit({ eventId: event.id });
      }
    } catch (error) {
      setMessage(cleanError(error));
    } finally {
      setWorking(false);
    }
  }

  return (
    <article className={`volunteer-event-card ${isCommitted ? "is-committed" : ""}`}>
      <div className="volunteer-event-card__date">
        <span>{formatMonth(event.startsAt)}</span>
        <strong>{formatDay(event.startsAt)}</strong>
      </div>
      <div className="volunteer-event-card__body">
        <span className={`account-status ${isCommitted ? "" : "account-status--waitlisted"}`}>
          {isCommitted ? "You’re serving" : "Volunteer opportunity"}
        </span>
        <h4>{event.title}</h4>
        <p>{formatEventDate(event.startsAt)} · {event.locationName}, {event.city}</p>
        <p>{event.excerpt}</p>
        {isCommitted && (
          <div className="volunteer-event-card__assignment">
            <span>Roster roles</span>
            <strong>{event.commitment?.roles.join(", ")}</strong>
          </div>
        )}
        {message && <p className="form-status form-status--error">{message}</p>}
        <div className="volunteer-event-card__actions">
          <button
            className={`button ${isCommitted ? "button--outline-dark" : "button--red"}`}
            type="button"
            disabled={working}
            onClick={updateCommitment}
          >
            {working
              ? "Updating…"
              : isCommitted
                ? "I can no longer serve"
                : "I can volunteer"}
          </button>
          <Link className="text-link" href={`/events/${event.slug}`}>
            Event details →
          </Link>
        </div>
      </div>
    </article>
  );
}

function PortalMessage({
  eyebrow,
  title,
  copy,
  children,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="panel volunteer-portal-message">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
      {children}
    </section>
  );
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

function formatEventDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function cleanError(error: unknown) {
  if (!(error instanceof Error)) return "We couldn't update this volunteer commitment.";
  return (
    error.message.match(/Uncaught ConvexError:\s*([^\n]+)/)?.[1] ??
    "We couldn't update this volunteer commitment."
  );
}
