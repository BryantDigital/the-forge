import type { Metadata } from "next";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import { fetchAuthQuery } from "../../../lib/auth-server";
import { AdminHeader } from "../components";

export const metadata: Metadata = { title: "Events — Forge Admin" };

export default async function AdminEventsPage() {
  const [access, events] = await Promise.all([
    fetchAuthQuery(api.adminAuth.requireEventManager, { allowCheckin: true }),
    fetchAuthQuery(api.events.listAdmin, {}),
  ]);
  const canManage = access?.role === "owner" || access?.role === "event_manager";
  const upcoming = events.filter(
    (event) => !event.isPast && event.status !== "cancelled",
  );
  const past = events.filter((event) => event.isPast);

  return (
    <div className="admin-shell">
      <AdminHeader />
      <main className="shell admin-main">
        <div className="admin-title">
          <div>
            <p className="eyebrow">Programs and operations</p>
            <h1>Events</h1>
            <p>Registration, capacity, attendance, and volunteer coverage.</p>
          </div>
          {canManage && (
            <Link className="button button--red" href="/admin/events/new">
              Create event
            </Link>
          )}
        </div>

        <section className="metric-grid">
          <div className="metric metric--red">
            <span>Upcoming</span>
            <strong>{upcoming.length}</strong>
          </div>
          <div className="metric">
            <span>Past events</span>
            <strong>{past.length}</strong>
          </div>
          <div className="metric">
            <span>Upcoming registrations</span>
            <strong>{upcoming.reduce((total, event) => total + event.registered, 0)}</strong>
          </div>
          <div className="metric">
            <span>Upcoming waitlist</span>
            <strong>{upcoming.reduce((total, event) => total + event.waitlisted, 0)}</strong>
          </div>
        </section>

        <section className="table-card">
          <div className="table-card__header">
            <div>
              <p className="eyebrow">Full event history</p>
              <h2>Event performance</h2>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Capacity used</th>
                  <th>Waitlist</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event._id}>
                    <td>
                      <Link className="table-link" href={`/admin/events/${event.slug}`}>
                        {event.title}
                      </Link>
                      <small className="table-subline">{formatDate(event.startsAt)}</small>
                    </td>
                    <td>
                      <span className={`tag ${event.status === "published" ? "tag--green" : ""}`}>
                        {capitalize(event.status)}
                      </span>
                    </td>
                    <td>{event.registered}</td>
                    <td>
                      <div className="capacity-cell">
                        <span>
                          <i
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round((event.registered / event.capacity) * 100),
                              )}%`,
                            }}
                          />
                        </span>
                        <small>{Math.round((event.registered / event.capacity) * 100)}%</small>
                      </div>
                    </td>
                    <td>{event.waitlisted}</td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={5}>No events have been created yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
