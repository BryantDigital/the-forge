import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { fetchAuthQuery } from "../../lib/auth-server";
import { AdminHeader } from "./components";

export const metadata: Metadata = { title: "Executive Dashboard — Forge Admin" };

export default async function AdminPage() {
  const access = await fetchAuthQuery(api.adminAuth.requireEventManager, {});
  if (access?.role === "checkin") {
    redirect("/admin/events");
  }
  const summary = await fetchAuthQuery(
    api.adminDashboard.getExecutiveSummary,
    {},
  );
  const metrics = summary.metrics;
  const maxAttendance = Math.max(
    1,
    ...summary.monthlyTrend.map((month) => month.attendance),
  );

  return (
    <div className="admin-shell">
      <AdminHeader />
      <main className="shell admin-main executive-dashboard">
        <div className="admin-title">
          <div>
            <p className="eyebrow">{formatLongDate(summary.generatedAt)}</p>
            <h1>Executive overview</h1>
            <p>
              Mission health, ministry reach, people, and giving—pulled from live
              Forge records.
            </p>
          </div>
          <div className="admin-title__actions">
            <span className="dashboard-freshness">Updated just now</span>
            <Link className="button button--red" href="/admin/events/new">
              Create event
            </Link>
          </div>
        </div>

        <section className="executive-kpi-grid" aria-label="Ministry at a glance">
          <MetricCard
            eyebrow={`${summary.year} ministry reach`}
            label="Kids served"
            value={number(metrics.uniqueKidsServedYtd)}
            detail={`${number(metrics.attendanceYtd)} total child check-ins`}
            comparison={comparison(
              metrics.uniqueKidsServedYtd,
              metrics.uniqueKidsServedPreviousYtd,
            )}
            href="/admin/families#children"
            featured
          />
          <MetricCard
            eyebrow="New to The Forge"
            label="First-time kids"
            value={number(metrics.firstTimeKidsYtd)}
            detail={`${percentOf(
              metrics.firstTimeKidsYtd,
              metrics.uniqueKidsServedYtd,
            )} of kids served`}
            comparison={comparison(
              metrics.firstTimeKidsYtd,
              metrics.firstTimeKidsPreviousYtd,
            )}
            href="/admin/families#first-time"
          />
          <MetricCard
            eyebrow="Households"
            label="Families"
            value={number(metrics.totalFamilies)}
            detail={`${number(metrics.familiesServedYtd)} served this year · ${number(
              metrics.newFamiliesYtd,
            )} new`}
            href="/admin/families"
          />
          <MetricCard
            eyebrow={`${summary.year} contributions`}
            label="Giving"
            value={currency(metrics.givingYtdInCents)}
            detail={`${number(metrics.donorsYtd)} donors · ${number(
              metrics.recurringDonors,
            )} recurring`}
            comparison={comparison(
              metrics.givingYtdInCents,
              metrics.givingPreviousYtdInCents,
            )}
            href="/admin/giving"
          />
          <MetricCard
            eyebrow="People serving"
            label="Volunteers"
            value={number(metrics.activeVolunteers)}
            detail={`${number(metrics.pendingVolunteers)} need attention`}
            href="/admin/volunteers"
          />
          <MetricCard
            eyebrow="On the calendar"
            label="Events"
            value={number(metrics.upcomingEvents)}
            detail={`${number(metrics.completedEventsYtd)} completed this year`}
            href="/admin/events"
          />
        </section>

        <div className="executive-content-grid">
          <section className="table-card executive-events">
            <div className="table-card__header">
              <div>
                <p className="eyebrow">Operational view</p>
                <h2>Event health</h2>
              </div>
              <Link className="text-link" href="/admin/events">
                All events →
              </Link>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Registration</th>
                    <th>Attendance</th>
                    <th>Volunteers</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.eventRows.map((event) => (
                    <tr key={event.id}>
                      <td>
                        <Link
                          className="table-link"
                          href={`/admin/events/${event.slug}`}
                        >
                          {event.title}
                        </Link>
                        <small className="table-subline">
                          {formatDate(event.startsAt)} · {formatStatus(event.status)}
                        </small>
                      </td>
                      <td>
                        <strong>{event.registered}</strong> / {event.capacity}
                        {event.waitlisted > 0 && (
                          <small className="table-subline">
                            {event.waitlisted} waitlisted
                          </small>
                        )}
                      </td>
                      <td>
                        <strong>{event.checkedIn}</strong>
                        <small className="table-subline">boys checked in</small>
                      </td>
                      <td>
                        <strong>{event.volunteers}</strong>
                        <small className="table-subline">committed</small>
                      </td>
                    </tr>
                  ))}
                  {summary.eventRows.length === 0 && (
                    <tr>
                      <td colSpan={4}>No events have been created yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel executive-trend">
            <div className="executive-section-heading">
              <div>
                <p className="eyebrow">Six-month pulse</p>
                <h2>Attendance trend</h2>
              </div>
              <span className="tag">Check-ins</span>
            </div>
            <div className="attendance-chart" aria-label="Monthly attendance">
              {summary.monthlyTrend.map((month) => (
                <div className="attendance-chart__month" key={month.label}>
                  <div className="attendance-chart__value">
                    <strong>{month.attendance}</strong>
                    <span
                      style={{
                        height: `${Math.max(
                          8,
                          (month.attendance / maxAttendance) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                  <small>{month.label}</small>
                </div>
              ))}
            </div>
            <div className="trend-summary">
              <span>
                <strong>
                  {number(
                    summary.monthlyTrend.reduce(
                      (total, month) => total + month.firstTimeKids,
                      0,
                    ),
                  )}
                </strong>
                First-time kids
              </span>
              <span>
                <strong>
                  {currency(
                    summary.monthlyTrend.reduce(
                      (total, month) => total + month.givingInCents,
                      0,
                    ),
                  )}
                </strong>
                Six-month giving
              </span>
            </div>
          </section>
        </div>

        <section className="table-card executive-activity">
          <div className="table-card__header">
            <div>
              <p className="eyebrow">Across the ministry</p>
              <h2>Recent activity</h2>
            </div>
            <span className={`tag ${summary.givingMode === "live" ? "tag--green" : ""}`}>
              Giving: {summary.givingMode}
            </span>
          </div>
          <div className="activity-feed">
            {summary.recentActivity.map((activity) => (
              <Link className="activity-feed__item" href={activity.href} key={activity.id}>
                <span className={`activity-icon activity-icon--${activity.kind}`}>
                  {activity.kind === "attendance"
                    ? "A"
                    : activity.kind === "giving"
                      ? "$"
                      : "V"}
                </span>
                <span>
                  <strong>{activity.title}</strong>
                  <small>{activity.detail}</small>
                </span>
                <time>{formatRelativeDate(activity.occurredAt, summary.generatedAt)}</time>
              </Link>
            ))}
            {summary.recentActivity.length === 0 && (
              <p className="dashboard-empty">Activity will appear as families, volunteers, and donors engage.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function MetricCard({
  eyebrow,
  label,
  value,
  detail,
  comparison: change,
  href,
  featured = false,
}: {
  eyebrow: string;
  label: string;
  value: string;
  detail: string;
  comparison?: string;
  href: string;
  featured?: boolean;
}) {
  return (
    <Link
      className={`executive-kpi ${featured ? "executive-kpi--featured" : ""}`}
      href={href}
    >
      <span className="executive-kpi__eyebrow">{eyebrow}</span>
      <span className="executive-kpi__label">{label}</span>
      <strong>{value}</strong>
      <span className="executive-kpi__detail">{detail}</span>
      <span className="executive-kpi__footer">
        {change ?? "View details"}
        <b>→</b>
      </span>
    </Link>
  );
}

function comparison(current: number, previous: number) {
  if (previous === 0) return current > 0 ? "New this year" : "No prior-year data";
  const percent = Math.round(((current - previous) / previous) * 100);
  return `${percent >= 0 ? "↑" : "↓"} ${Math.abs(percent)}% vs. prior YTD`;
}

function percentOf(value: number, total: number) {
  return total > 0 ? `${Math.round((value / total) * 100)}%` : "0%";
}

function number(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function currency(amountInCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountInCents / 100);
}

function formatLongDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatRelativeDate(timestamp: number, now: number) {
  const minutes = Math.max(0, Math.round((now - timestamp) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
