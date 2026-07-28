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
          <button className="button button--red" type="button">Create event</button>
        </div>

        <section className="metric-grid" aria-label="At a glance">
          <div className="metric metric--red"><span>Next event</span><strong>47 days</strong></div>
          <div className="metric"><span>Registered boys</span><strong>0 / 30</strong></div>
          <div className="metric"><span>Waitlisted</span><strong>0</strong></div>
          <div className="metric"><span>Open volunteers</span><strong>3</strong></div>
        </section>

        <div className="admin-grid">
          <section className="table-card">
            <div className="table-card__header">
              <h2>Events</h2>
              <Link className="text-link" href="/admin/events/the-forge-september-12">View calendar →</Link>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Event</th><th>Date</th><th>Registration</th><th>Roster</th></tr></thead>
                <tbody>
                  <tr>
                    <td><Link className="table-link" href="/admin/events/the-forge-september-12">The Forge — September 12</Link></td>
                    <td>Sep 12, 2026</td>
                    <td><span className="tag">Opens Sep 1</span></td>
                    <td>0 / 30</td>
                  </tr>
                  <tr>
                    <td><span className="table-link">The Forge — July 18</span></td>
                    <td>Jul 18, 2026</td>
                    <td><span className="tag tag--green">Complete</span></td>
                    <td>22 / 30 attended</td>
                  </tr>
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
