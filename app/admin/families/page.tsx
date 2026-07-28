import type { Metadata } from "next";
import { api } from "../../../convex/_generated/api";
import { fetchAuthQuery } from "../../../lib/auth-server";
import { AdminHeader } from "../components";

export const metadata: Metadata = { title: "Families — Forge Admin" };

export default async function AdminFamiliesPage() {
  const families = await fetchAuthQuery(api.adminDashboard.listFamilies, {});
  const familiesServed = families.filter((family) => family.attendedEventCount > 0);
  const totalChildren = families.reduce(
    (total, family) => total + family.childCount,
    0,
  );
  const totalAttendance = families.reduce(
    (total, family) => total + family.attendanceCount,
    0,
  );

  return (
    <div className="admin-shell">
      <AdminHeader />
      <main className="shell admin-main">
        <div className="admin-title">
          <div>
            <p className="eyebrow">Ministry relationships</p>
            <h1>Families & kids</h1>
            <p>Household growth, participation, and attendance history.</p>
          </div>
        </div>

        <section className="metric-grid">
          <div className="metric metric--red">
            <span>Total families</span>
            <strong>{families.length}</strong>
          </div>
          <div className="metric">
            <span>Families served</span>
            <strong>{familiesServed.length}</strong>
          </div>
          <div className="metric" id="children">
            <span>Saved child profiles</span>
            <strong>{totalChildren}</strong>
          </div>
          <div className="metric">
            <span>Total child check-ins</span>
            <strong>{totalAttendance}</strong>
          </div>
        </section>

        <section className="table-card" id="first-time">
          <div className="table-card__header">
            <div>
              <p className="eyebrow">Household engagement</p>
              <h2>Family directory</h2>
            </div>
            <span className="tag">{families.length} households</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Parent or guardian</th>
                  <th>Children</th>
                  <th>Registrations</th>
                  <th>Events attended</th>
                  <th>Child check-ins</th>
                  <th>First visit</th>
                </tr>
              </thead>
              <tbody>
                {families.map((family) => (
                  <tr key={family.id}>
                    <td>
                      <strong>{family.parentName}</strong>
                      <a className="table-subline table-link" href={`mailto:${family.email}`}>
                        {family.email}
                      </a>
                      <a className="table-subline" href={`tel:${family.mobilePhone}`}>
                        {family.mobilePhone}
                      </a>
                    </td>
                    <td>{family.childCount}</td>
                    <td>{family.registrationCount}</td>
                    <td>{family.attendedEventCount}</td>
                    <td>{family.attendanceCount}</td>
                    <td>
                      {family.firstVisitAt ? (
                        <span className="tag tag--green">
                          {formatDate(family.firstVisitAt)}
                        </span>
                      ) : (
                        <span className="tag">Not yet attended</span>
                      )}
                    </td>
                  </tr>
                ))}
                {families.length === 0 && (
                  <tr>
                    <td colSpan={6}>No family records have been created yet.</td>
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
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}
