import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { fetchAuthQuery } from "../../lib/auth-server";
import { AdminHeader } from "./components";

export const metadata: Metadata = { title: "Forge Admin" };

export default async function AdminPage() {
  const access = await fetchAuthQuery(api.adminAuth.requireEventManager, {});
  if (access?.role === "checkin") {
    redirect("/admin/events/the-forge-september-12");
  }
  const events = await fetchAuthQuery(api.events.listAdmin, {});
  const nextEvent = [...events]
    .filter((event) => event.startsAt >= Date.now() && event.status !== "cancelled")
    .sort((a, b) => a.startsAt - b.startsAt)[0];
  const registered = nextEvent?.registered ?? 0;
  const waitlisted = nextEvent?.waitlisted ?? 0;

  return (
    <div className="admin-shell">
      <AdminHeader />
      <main className="shell admin-main">
        <div className="admin-title">
          <div>
            <p className="eyebrow">Monday, July 27</p>
            <h1>Command center</h1>
            <p>Here&apos;s what needs your attention across The Forge.</p>
          </div>
          <Link className="button button--red" href="/admin/events/new">Create event</Link>
        </div>

        <section className="metric-grid" aria-label="At a glance">
          <div className="metric metric--red"><span>Next event</span><strong>{nextEvent ? daysUntil(nextEvent.startsAt) : "None"}</strong></div>
          <div className="metric"><span>Registered boys</span><strong>{registered} / {nextEvent?.capacity ?? 0}</strong></div>
          <div className="metric"><span>Waitlisted</span><strong>{waitlisted}</strong></div>
          <div className="metric"><span>Open volunteers</span><strong>3</strong></div>
        </section>

        <div className="admin-grid">
          <section className="table-card">
            <div className="table-card__header">
              <h2>Events</h2>
              <Link className="text-link" href="/events">View public events →</Link>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Event</th><th>Date</th><th>Registration</th><th>Roster</th></tr></thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event._id}>
                      <td><Link className="table-link" href={`/admin/events/${event.slug}`}>{event.title}</Link></td>
                      <td>{formatDate(event.startsAt)}</td>
                      <td><span className={`tag ${event.status === "published" ? "tag--green" : ""}`}>{formatStatus(event.status)}</span></td>
                      <td>{event.registered} / {event.capacity}</td>
                    </tr>
                  ))}
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={4}>No live events yet. Create the first event to publish it on the site.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="panel">
            <h3>Recent activity</h3>
            <div className="activity-list">
              <div className="activity">
                <p>New volunteer application</p>
                <small>Forge Coach · 2 hours ago</small>
              </div>
              <div className="activity">
                <p>July attendance finalized</p>
                <small>22 of 30 checked in · 6 days ago</small>
              </div>
              <div className="activity">
                <p>September event published</p>
                <small>Registration opens Sep 1 · 1 week ago</small>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function daysUntil(timestamp: number) {
  const days = Math.max(0, Math.ceil((timestamp - Date.now()) / 86_400_000));
  return days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"}`;
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

function formatStatus(status: "draft" | "published" | "cancelled" | "completed") {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
