import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { fetchAuthQuery } from "../../../lib/auth-server";
import { AdminHeader } from "../components";

export const metadata: Metadata = { title: "Volunteers — Forge Admin" };

export default async function VolunteersAdminPage() {
  const access = await fetchAuthQuery(api.adminAuth.requireEventManager, {});
  if (!access) redirect("/admin");
  const submissions = await fetchAuthQuery(api.volunteers.listAdmin, {});
  const counts = {
    new: submissions.filter((item) => item.status === "new").length,
    pending: submissions.filter((item) => item.status === "pending").length,
    approved: submissions.filter((item) => item.status === "approved").length,
    denied: submissions.filter((item) => item.status === "denied").length,
  };

  return (
    <div className="admin-shell">
      <AdminHeader />
      <main className="shell admin-main">
        <Link className="text-link" href="/admin">← Dashboard</Link>
        <div className="admin-title admin-title--volunteers">
          <div>
            <p className="eyebrow">Volunteer pipeline</p>
            <h1>People ready to serve.</h1>
            <p>Review applications, send agreements, and track approvals.</p>
          </div>
          <Link className="button button--red" href="/volunteer">
            View public form
          </Link>
        </div>

        <section className="metric-grid">
          <div className="metric metric--red"><span>New</span><strong>{counts.new}</strong></div>
          <div className="metric"><span>Pending signature</span><strong>{counts.pending}</strong></div>
          <div className="metric"><span>Approved</span><strong>{counts.approved}</strong></div>
          <div className="metric"><span>Denied</span><strong>{counts.denied}</strong></div>
        </section>

        <section className="table-card">
          <div className="table-card__header">
            <div>
              <h2>Volunteer applications</h2>
              <p className="admin-muted">Newest applications appear first.</p>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Roles</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Portal access</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td>
                      <strong>{submission.name}</strong>
                      <br />
                      <a className="table-link" href={`mailto:${submission.email}`}>
                        {submission.email}
                      </a>
                    </td>
                    <td>{submission.roles.join(", ")}</td>
                    <td>{formatDate(submission.createdAt)}</td>
                    <td>
                      <span className={`tag volunteer-status volunteer-status--${normalizeStatus(submission.status)}`}>
                        {statusLabel(submission.status)}
                      </span>
                    </td>
                    <td>
                      {submission.status === "approved" ? (
                        <span className={`tag ${
                          submission.accessStatus === "active" ? "tag--green" : ""
                        }`}>
                          {submission.accessStatus === "active"
                            ? "Active"
                            : submission.accessStatus === "revoked"
                              ? "Revoked"
                              : "Not activated"}
                        </span>
                      ) : "—"}
                    </td>
                    <td>
                      <Link className="text-link" href={`/admin/volunteers/${submission.id}`}>
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan={6}>No volunteer applications have been submitted yet.</td>
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

function statusLabel(status: string) {
  if (status === "pending") return "Pending signature";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function normalizeStatus(status: string) {
  return ["new", "pending", "approved", "denied"].includes(status)
    ? status
    : "legacy";
}
