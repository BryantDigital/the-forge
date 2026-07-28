import type { Metadata } from "next";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { fetchAuthQuery } from "../../../../lib/auth-server";
import { AdminHeader } from "../../components";
import { CommunicationComposer } from "./communication-composer";
import { RosterActions } from "./roster-actions";
import { RosterTable } from "./roster-table";

export const metadata: Metadata = { title: "Event Roster — Forge Admin" };

export default async function AdminEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const access = await fetchAuthQuery(api.adminAuth.requireEventManager, {
    allowCheckin: true,
  });
  const event = await fetchAuthQuery(api.events.getAdminBySlug, { slug });
  const roster = await fetchAuthQuery(api.events.getRoster, { slug });
  const parentRoster = await fetchAuthQuery(api.events.getParentRoster, { slug });
  if (!event) {
    return (
      <div className="admin-shell">
        <AdminHeader />
        <main className="shell admin-main">
          <Link className="text-link" href="/admin">← Dashboard</Link>
          <div className="admin-title"><h1>Event not found</h1></div>
        </main>
      </div>
    );
  }
  const volunteerRoster = await fetchAuthQuery(
    api.volunteerPortal.getEventRoster,
    { eventId: event._id },
  );
  const canManage = access?.role === "owner" || access?.role === "event_manager";
  const rosterChildren = roster ?? [];
  const checkedIn = rosterChildren.filter((child) => child.checkedIn).length;
  return (
    <div className="admin-shell">
      <AdminHeader />
      <main className="shell admin-main">
        <Link className="text-link" href="/admin">← Dashboard</Link>
        <div style={{ height: 26 }} />
        <div className="admin-title">
          <div>
            <p className="eyebrow">{formatDate(event.startsAt)} · {event.status}</p>
            <h1>{event.title}</h1>
            <p>{event.city} · {formatTime(event.startsAt)}–{formatTime(event.endsAt)} Eastern</p>
          </div>
          {canManage && (
            <div className="admin-title__actions">
              <Link className="button button--ghost" href={`/admin/events/${event.slug}/edit`}>Edit event</Link>
              <Link className="button button--red" href="#message-families">Message families</Link>
            </div>
          )}
        </div>

        <section className="metric-grid">
          <div className="metric metric--red"><span>Registered</span><strong>{event.registered} / {event.capacity}</strong></div>
          <div className="metric"><span>Spots left</span><strong>{event.remaining}</strong></div>
          <div className="metric"><span>Waitlisted</span><strong>{event.waitlisted}</strong></div>
          <div className="metric"><span>Checked in</span><strong>{checkedIn} / {rosterChildren.length}</strong></div>
        </section>

        {canManage && (
          <CommunicationComposer
            eventId={event._id}
            eventTitle={event.title}
            registeredFamilies={event.registeredFamilies}
            registeredSms={event.registeredSms}
            waitlistedFamilies={event.waitlistedFamilies}
            waitlistedSms={event.waitlistedSms}
          />
        )}

        {canManage && (
          <section className="table-card parent-roster-card">
            <div className="table-card__header roster-toolbar">
              <div>
                <h2>Registered parents</h2>
                <p style={{ margin: "6px 0 0", color: "var(--smoke)" }}>
                  Household contacts and registration status
                </p>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Parent or guardian</th>
                    <th>Contact</th>
                    <th>Children</th>
                    <th>Notifications</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(parentRoster ?? []).map((parent) => (
                    <tr key={parent.id}>
                      <td><strong>{parent.parentName}</strong></td>
                      <td>
                        <a className="table-link" href={`mailto:${parent.email}`}>{parent.email}</a>
                        <br />
                        <a href={`tel:${parent.mobilePhone}`}>{parent.mobilePhone}</a>
                      </td>
                      <td>{parent.childCount}</td>
                      <td>
                        {[
                          parent.emailNotificationsEnabled ? "Email" : null,
                          parent.smsNotificationsEnabled ? "SMS" : null,
                        ].filter(Boolean).join(" + ") || "None"}
                      </td>
                      <td>
                        <span className={`tag ${parent.status === "confirmed" ? "tag--green" : ""}`}>
                          {formatRegistrationStatus(parent.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(parentRoster ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5}>No parents have registered for this event yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="table-card event-volunteer-roster">
          <div className="table-card__header roster-toolbar">
            <div>
              <h2>Volunteer roster</h2>
              <p style={{ margin: "6px 0 0", color: "var(--smoke)" }}>
                Approved volunteers who raised their hand for this event
              </p>
            </div>
            <span className="tag tag--green">
              {volunteerRoster.length} serving
            </span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Volunteer</th>
                  <th>Contact</th>
                  <th>Approved service areas</th>
                  <th>Committed</th>
                </tr>
              </thead>
              <tbody>
                {volunteerRoster.map((volunteer) => (
                  <tr key={volunteer.id}>
                    <td>
                      <Link
                        className="table-link"
                        href={`/admin/volunteers/${volunteer.volunteerSubmissionId}`}
                      >
                        {volunteer.name}
                      </Link>
                    </td>
                    <td>
                      <a href={`mailto:${volunteer.email}`}>{volunteer.email}</a>
                      <br />
                      <a href={`tel:${volunteer.mobilePhone}`}>{volunteer.mobilePhone}</a>
                    </td>
                    <td>{volunteer.roles.join(", ")}</td>
                    <td>{formatDateTime(volunteer.committedAt)}</td>
                  </tr>
                ))}
                {volunteerRoster.length === 0 && (
                  <tr>
                    <td colSpan={4}>No volunteers have committed to this event yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="table-card print-roster">
          <div className="print-roster__heading">
            <p>The Forge Christian Ministries</p>
            <h1>{event.title}</h1>
            <span>
              Child check-in roster · {formatDate(event.startsAt)} · {rosterChildren.length} registered
            </span>
          </div>
          <div className="table-card__header roster-toolbar">
            <div>
              <h2>Child check-in</h2>
              <p style={{ margin: "6px 0 0", color: "var(--smoke)" }}>
                Alphabetical roster · attendance saves immediately
              </p>
            </div>
            <RosterActions
              eventTitle={event.title}
              eventDate={formatDate(event.startsAt)}
              rosterChildren={rosterChildren}
            />
          </div>
          <RosterTable rosterChildren={rosterChildren} />
        </section>
      </main>
    </div>
  );
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function formatRegistrationStatus(
  status: "confirmed" | "waitlisted" | "offered" | "cancelled",
) {
  if (status === "offered") return "Seat offered";
  return status.charAt(0).toUpperCase() + status.slice(1);
}
