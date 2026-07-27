import type { Metadata } from "next";
import Link from "next/link";
import { roster } from "../../../data";
import { AdminHeader } from "../../components";

export const metadata: Metadata = { title: "Event Roster — Forge Admin" };

export default function AdminEventPage() {
  const checkedIn = roster.filter((child) => child.checkedIn).length;
  return (
    <div className="admin-shell">
      <AdminHeader />
      <main className="shell admin-main">
        <Link className="text-link" href="/admin">← Dashboard</Link>
        <div style={{ height: 26 }} />
        <div className="admin-title">
          <div>
            <p className="eyebrow">July 18, 2026 · Completed</p>
            <h1>The Forge — July 18</h1>
            <p>OneLife Fitness Princess Anne · 3:00–6:00 PM</p>
          </div>
          <button className="button button--red" type="button">Email families</button>
        </div>

        <section className="metric-grid">
          <div className="metric metric--red"><span>Checked in</span><strong>{checkedIn} / {roster.length}</strong></div>
          <div className="metric"><span>Registered</span><strong>30</strong></div>
          <div className="metric"><span>Cancelled</span><strong>4</strong></div>
          <div className="metric"><span>Attendance</span><strong>73%</strong></div>
        </section>

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
