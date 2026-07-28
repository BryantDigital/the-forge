import type { Metadata } from "next";
import { api } from "../../../convex/_generated/api";
import { fetchAuthQuery } from "../../../lib/auth-server";
import { AdminHeader } from "../components";

export const metadata: Metadata = { title: "Giving — Forge Admin" };

export default async function AdminGivingPage() {
  const data = await fetchAuthQuery(api.adminDashboard.listGiving, {});
  const recurring = data.donors.filter((donor) => donor.recurring).length;

  return (
    <div className="admin-shell">
      <AdminHeader />
      <main className="shell admin-main">
        <div className="admin-title">
          <div>
            <p className="eyebrow">Development and generosity</p>
            <h1>Giving & donors</h1>
            <p>Stripe-backed contribution history and donor relationships.</p>
          </div>
          <span className={`tag ${data.mode === "live" ? "tag--green" : "tag--red"}`}>
            {data.mode === "live" ? "Live Stripe data" : "Stripe test data"}
          </span>
        </div>

        <section className="metric-grid">
          <div className="metric metric--red">
            <span>All-time giving</span>
            <strong>{currency(data.totalInCents)}</strong>
          </div>
          <div className="metric">
            <span>Donors</span>
            <strong>{data.donors.length}</strong>
          </div>
          <div className="metric">
            <span>Recurring donors</span>
            <strong>{recurring}</strong>
          </div>
          <div className="metric">
            <span>Average gift</span>
            <strong>{currency(data.averageGiftInCents)}</strong>
          </div>
        </section>

        <div className="admin-grid giving-admin-grid">
          <section className="table-card">
            <div className="table-card__header">
              <div>
                <p className="eyebrow">Relationship view</p>
                <h2>Donors</h2>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Donor</th>
                    <th>Lifetime giving</th>
                    <th>Gifts</th>
                    <th>Last gift</th>
                    <th>Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.donors.map((donor) => (
                    <tr key={donor.email}>
                      <td>
                        <strong>{donor.name}</strong>
                        <a className="table-subline table-link" href={`mailto:${donor.email}`}>
                          {donor.email}
                        </a>
                      </td>
                      <td>{currency(donor.totalInCents)}</td>
                      <td>{donor.giftCount}</td>
                      <td>{formatDate(donor.lastGiftAt)}</td>
                      <td>
                        <span className={`tag ${donor.recurring ? "tag--green" : ""}`}>
                          {donor.recurring ? "Recurring" : "One-time"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data.donors.length === 0 && (
                    <tr>
                      <td colSpan={5}>No paid Stripe gifts are recorded in this mode yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="panel recent-gifts-panel">
            <p className="eyebrow">Transaction view</p>
            <h2>Recent gifts</h2>
            <div className="recent-gift-list">
              {data.gifts.slice(0, 10).map((gift) => (
                <div key={gift.id}>
                  <span>
                    <strong>{gift.name}</strong>
                    <small>
                      {formatDate(gift.occurredAt)} · {frequencyLabel(gift.frequency)}
                    </small>
                  </span>
                  <b>{currency(gift.amountInCents)}</b>
                </div>
              ))}
              {data.gifts.length === 0 && <p>No gifts to show yet.</p>}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function currency(amountInCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountInCents / 100);
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

function frequencyLabel(value: string) {
  if (value === "one_time") return "One-time";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
