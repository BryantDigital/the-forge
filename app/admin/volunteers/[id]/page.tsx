import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { fetchAuthQuery } from "../../../../lib/auth-server";
import { AdminHeader } from "../../components";
import { VolunteerAccessActions } from "./access-actions";
import { VolunteerReviewActions } from "./review-actions";

export const metadata: Metadata = { title: "Volunteer Review — Forge Admin" };

export default async function VolunteerReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await fetchAuthQuery(api.adminAuth.requireEventManager, {});
  if (!access) redirect("/admin");
  const submission = await fetchAuthQuery(api.volunteers.getAdmin, {
    submissionId: id as Id<"volunteerSubmissions">,
  });
  if (!submission) notFound();

  return (
    <div className="admin-shell">
      <AdminHeader />
      <main className="shell admin-main">
        <Link className="text-link" href="/admin/volunteers">← Volunteers</Link>
        <div className="admin-title admin-title--volunteer-review">
          <div>
            <p className="eyebrow">Volunteer application</p>
            <h1>{submission.name}</h1>
            <p>Submitted {formatDateTime(submission.createdAt)}</p>
          </div>
          <span className={`tag volunteer-status volunteer-status--${submission.status}`}>
            {statusLabel(submission.status)}
          </span>
        </div>

        <div className="volunteer-admin-grid">
          <section className="table-card volunteer-review-card">
            <div className="table-card__header">
              <h2>Application</h2>
            </div>
            <dl className="volunteer-application-details">
              <div><dt>Email</dt><dd><a href={`mailto:${submission.email}`}>{submission.email}</a></dd></div>
              <div><dt>Mobile</dt><dd><a href={`tel:${submission.mobilePhone}`}>{submission.mobilePhone}</a></dd></div>
              <div><dt>Roles</dt><dd>{submission.roleInterests.join(", ")}</dd></div>
              <div><dt>Statement of Faith</dt><dd>{submission.statementOfFaithAccepted ? "Affirmed" : "Not affirmed"}</dd></div>
              <div><dt>Background check</dt><dd>{submission.backgroundCheckAccepted ? "Willing" : "Not accepted"}</dd></div>
            </dl>
            <div className="volunteer-faith-response">
              <p className="eyebrow">Who is Jesus to you?</p>
              <p>{submission.faithResponse}</p>
            </div>
            {submission.denialReason && (
              <div className="volunteer-denial-note">
                <strong>Internal denial reason</strong>
                <p>{submission.denialReason}</p>
              </div>
            )}
          </section>

          <aside className="panel volunteer-workflow-panel">
            <p className="eyebrow">Review decision</p>
            <h2>{workflowTitle(submission.status)}</h2>
            <p>{workflowCopy(submission.status)}</p>
            <VolunteerReviewActions
              submissionId={submission._id}
              status={submission.status}
            />
            {submission.status === "approved" && (
              <VolunteerAccessActions
                submissionId={submission._id}
                accessStatus={submission.volunteerAccess?.status}
              />
            )}

            {submission.signatureRequest && (
              <div className="signature-admin-summary">
                <h3>Agreement activity</h3>
                <dl>
                  <div><dt>Status</dt><dd>{statusLabel(submission.signatureRequest.status)}</dd></div>
                  <div><dt>Sent</dt><dd>{formatOptional(submission.signatureRequest.sentAt)}</dd></div>
                  <div><dt>Viewed</dt><dd>{formatOptional(submission.signatureRequest.viewedAt)}</dd></div>
                  <div><dt>Signed</dt><dd>{formatOptional(submission.signatureRequest.signedAt)}</dd></div>
                </dl>
                {submission.signatureRequest.emailError && (
                  <p className="form-status form-status--error">
                    Email error: {submission.signatureRequest.emailError}
                  </p>
                )}
                {submission.signatureRequest.documentUrl && (
                  <a
                    className="button button--dark button--small"
                    href={submission.signatureRequest.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download signed PDF ↗
                  </a>
                )}
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    dateStyle: "long",
    timeStyle: "short",
  }).format(timestamp);
}

function formatOptional(timestamp?: number) {
  return timestamp ? formatDateTime(timestamp) : "—";
}

function statusLabel(status: string) {
  if (status === "pending") return "Pending signature";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function workflowTitle(status: string) {
  if (status === "approved") return "Approved to serve";
  if (status === "pending") return "Waiting for signature";
  if (status === "denied") return "Application denied";
  return "Review and decide";
}

function workflowCopy(status: string) {
  if (status === "approved") return "The signed agreement is stored below.";
  if (status === "pending") return "The volunteer has been emailed a secure signing link.";
  if (status === "denied") return "You may reconsider and send an agreement if circumstances change.";
  return "Accepting creates a secure agreement and immediately marks the application pending.";
}
