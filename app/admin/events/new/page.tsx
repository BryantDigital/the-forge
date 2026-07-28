import type { Metadata } from "next";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { fetchAuthQuery } from "../../../../lib/auth-server";
import { AdminHeader } from "../../components";
import { EventForm } from "../event-form";

export const metadata: Metadata = { title: "Create Event — Forge Admin" };

export default async function NewEventPage() {
  await fetchAuthQuery(api.adminAuth.requireEventManager, {});

  return (
    <div className="admin-shell">
      <AdminHeader />
      <main className="shell admin-main admin-form-page">
        <Link className="text-link" href="/admin">← Dashboard</Link>
        <div className="admin-title">
          <div>
            <p className="eyebrow">Forge Admin</p>
            <h1>Create an event</h1>
            <p>Set the public details, enrollment window, and available seats.</p>
          </div>
        </div>
        <EventForm />
      </main>
    </div>
  );
}
