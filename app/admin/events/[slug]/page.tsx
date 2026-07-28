import type { Metadata } from "next";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { fetchAuthQuery } from "../../../../lib/auth-server";
import { roster } from "../../../data";
import { AdminHeader } from "../../components";
import { CommunicationComposer } from "./communication-composer";

export const metadata: Metadata = { title: "Event Roster — Forge Admin" };

export default async function AdminEventPage() {
  const access = await fetchAuthQuery(api.adminAuth.requireEventManager, {
    allowCheckin: true,
  });
  const canManage = access?.role === "owner" || access?.role === "event_manager";
  const checkedIn = roster.filter((child) => child.checkedIn).length;
  return (
    <div className="admin-shell">
      <AdminHeader />
      <main className="shell admin-main">
        <Link className="text-link" href="/admin">← Dashboard</Link>
        <div style={{ height: 26 }} />
        <div className="admin-title">
          <div>
            <p className="eyebrow">September 12, 2026 · Upcoming</p>
            <h1>The Forge — September 12</h1>
            <p>Virginia Beach · 3:00–6:00 PM Eastern</p>
          </div>
          {canManage && (
            <Link className="button button--red" href="#message-families">
              Message families
            </Link>
          )}
        </div>

        <section className="metric-grid">
          <div className="metric metric--red"><span>Registered</span><strong>24 / 30</strong></div>
          <div className="metric"><span>SMS opted in</span><strong>21</strong></div>
          <div className="metric"><span>Waitlisted</span><strong>4</strong></div>
          <div className="metric"><span>Checked in</span><strong>{checkedIn} / {roster.length}</strong></div>
        </section>

        {canManage && <CommunicationComposer />}

        <section className="table-card">
          <div className="table-card__header roster-toolbar">
            <div>
              <h2>Child check-in</h2>
              <p style={{ margin: "6px 0 0", color: "var(--smoke)" }}>
                Alphabetical roster · attendance saves immediately
              </p>
            </div>
            <div className="roster-actions">
              <button className="choice" type="button" style={{ padding: "0 16px" }}>Print roster</button>
              <button className="choice" type="button" style={{ padding: "0 16px" }}>Export CSV</button>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Here</th><th>Child</th><th>Age</th><th>Notes</th><th>Status</th></tr></thead>
              <tbody>
                {roster.map((child) => (
                  <tr key={child.name}>
                    <td><input className="roster-check" type="checkbox" defaultChecked={child.checkedIn} aria-label={`Check in ${child.name}`} /></td>
                    <td><strong>{child.name}</strong></td>
                    <td>{child.age}</td>
                    <td>{child.notes || "—"}</td>
                    <td><span className={`tag ${child.checkedIn ? "tag--green" : ""}`}>{child.checkedIn ? "Checked in" : "Registered"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
