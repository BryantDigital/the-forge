import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { fetchAuthQuery } from "../../../../../lib/auth-server";
import { AdminHeader } from "../../../components";
import { EventForm } from "../../event-form";

export const metadata: Metadata = { title: "Edit Event — Forge Admin" };

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await fetchAuthQuery(api.events.getAdminBySlug, { slug });
  if (!event) notFound();

  return (
    <div className="admin-shell">
      <AdminHeader />
      <main className="shell admin-main admin-form-page">
        <Link className="text-link" href={`/admin/events/${event.slug}`}>← Event roster</Link>
        <div className="admin-title">
          <div>
            <p className="eyebrow">Forge Admin</p>
            <h1>Edit event</h1>
            <p>Changes to published events appear on the public site immediately.</p>
          </div>
        </div>
        <EventForm
          initial={{
            eventId: event._id,
            slug: event.slug,
            title: event.title,
            excerpt: event.excerpt,
            description: event.description,
            locationName: event.locationName,
            addressLine1: event.addressLine1,
            addressLine2: event.addressLine2,
            city: event.city,
            state: event.state,
            postalCode: event.postalCode,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            enrollmentOpensAt: event.enrollmentOpensAt,
            registrationClosesAt: event.registrationClosesAt,
            capacity: event.capacity,
            lowCapacityThreshold: event.lowCapacityThreshold,
            status: event.status,
          }}
        />
      </main>
    </div>
  );
}
