"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type EventFormValues = {
  eventId?: string;
  slug: string;
  title: string;
  excerpt: string;
  description: string;
  locationName: string;
  addressLine1?: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  startsAt: number;
  endsAt: number;
  enrollmentOpensAt: number;
  registrationClosesAt: number;
  capacity: number;
  lowCapacityThreshold: number;
  status: "draft" | "published" | "cancelled" | "completed";
};

export function EventForm({ initial }: { initial?: EventFormValues }) {
  const router = useRouter();
  const createEvent = useMutation(api.events.create);
  const updateEvent = useMutation(api.events.update);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const defaults = useMemo(() => initial ?? defaultEventValues(), [initial]);

  return (
    <form
      className="admin-event-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError("");
        const form = new FormData(event.currentTarget);
        const payload = {
          slug: String(form.get("slug") ?? "").trim(),
          title: String(form.get("title") ?? "").trim(),
          excerpt: String(form.get("excerpt") ?? "").trim(),
          description: String(form.get("description") ?? "").trim(),
          locationName: String(form.get("locationName") ?? "").trim(),
          addressLine1: optionalString(form.get("addressLine1")),
          addressLine2: optionalString(form.get("addressLine2")),
          city: String(form.get("city") ?? "").trim(),
          state: String(form.get("state") ?? "").trim(),
          postalCode: String(form.get("postalCode") ?? "").trim(),
          startsAt: toTimestamp(form.get("startsAt")),
          endsAt: toTimestamp(form.get("endsAt")),
          enrollmentOpensAt: toTimestamp(form.get("enrollmentOpensAt")),
          registrationClosesAt: toTimestamp(form.get("registrationClosesAt")),
          capacity: Number(form.get("capacity")),
          lowCapacityThreshold: Number(form.get("lowCapacityThreshold")),
          status: String(form.get("status")) as EventFormValues["status"],
        };

        try {
          const result = initial?.eventId
            ? await updateEvent({
                eventId: initial.eventId as Id<"events">,
                ...payload,
              })
            : await createEvent(payload);
          router.push(`/admin/events/${result.slug}`);
          router.refresh();
        } catch (cause) {
          setSubmitting(false);
          setError(readableError(cause));
        }
      }}
    >
      <section className="panel admin-form-section">
        <div className="admin-form-section__heading">
          <p className="eyebrow">Event basics</p>
          <h2>What families will see</h2>
        </div>
        <div className="field-grid">
          <label className="field field--full">
            <span>Event title</span>
            <input
              className="form-control"
              name="title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (!initial?.eventId) setSlug(slugify(event.target.value));
              }}
              required
            />
          </label>
          <label className="field field--full">
            <span>URL slug</span>
            <input
              className="form-control"
              name="slug"
              value={slug}
              onChange={(event) => setSlug(slugify(event.target.value))}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
            />
          </label>
          <label className="field field--full">
            <span>Card summary</span>
            <textarea className="form-control" name="excerpt" rows={2} defaultValue={defaults.excerpt} required />
          </label>
          <label className="field field--full">
            <span>Event description</span>
            <textarea className="form-control" name="description" rows={7} defaultValue={defaults.description} required />
            <small>Separate paragraphs with a blank line.</small>
          </label>
        </div>
      </section>

      <section className="panel admin-form-section">
        <div className="admin-form-section__heading">
          <p className="eyebrow">Schedule</p>
          <h2>Eastern time</h2>
        </div>
        <div className="field-grid admin-form-grid">
          <DateField label="Event starts" name="startsAt" value={defaults.startsAt} />
          <DateField label="Event ends" name="endsAt" value={defaults.endsAt} />
          <DateField label="Enrollment opens" name="enrollmentOpensAt" value={defaults.enrollmentOpensAt} />
          <DateField label="Registration closes" name="registrationClosesAt" value={defaults.registrationClosesAt} />
        </div>
      </section>

      <section className="panel admin-form-section">
        <div className="admin-form-section__heading">
          <p className="eyebrow">Location & capacity</p>
          <h2>Operational details</h2>
        </div>
        <div className="field-grid admin-form-grid">
          <label className="field field--full">
            <span>Location name</span>
            <input className="form-control" name="locationName" defaultValue={defaults.locationName} required />
          </label>
          <label className="field field--full">
            <span>Address</span>
            <input className="form-control" name="addressLine1" defaultValue={defaults.addressLine1} />
          </label>
          <label className="field field--full">
            <span>Address line 2</span>
            <input className="form-control" name="addressLine2" defaultValue={defaults.addressLine2} />
          </label>
          <label className="field">
            <span>City</span>
            <input className="form-control" name="city" defaultValue={defaults.city} required />
          </label>
          <label className="field">
            <span>State</span>
            <input className="form-control" name="state" defaultValue={defaults.state} maxLength={2} required />
          </label>
          <label className="field">
            <span>ZIP code</span>
            <input className="form-control" name="postalCode" defaultValue={defaults.postalCode} required />
          </label>
          <label className="field">
            <span>Total seats</span>
            <input className="form-control" name="capacity" type="number" min={1} defaultValue={defaults.capacity} required />
          </label>
          <label className="field">
            <span>Low-seat warning</span>
            <input className="form-control" name="lowCapacityThreshold" type="number" min={1} defaultValue={defaults.lowCapacityThreshold} required />
          </label>
          <label className="field">
            <span>Publishing status</span>
            <select className="form-control" name="status" defaultValue={defaults.status}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>
      </section>

      {error && <p className="form-status form-status--error" role="alert">{error}</p>}
      <div className="admin-form-actions">
        <button className="button button--red" type="submit" disabled={submitting}>
          {submitting ? "Saving event…" : initial?.eventId ? "Save event" : "Create event"}
        </button>
        <button className="button button--ghost" type="button" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function DateField({ label, name, value }: { label: string; name: string; value: number }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        className="form-control"
        name={name}
        type="datetime-local"
        defaultValue={toLocalInput(value)}
        required
      />
    </label>
  );
}

function defaultEventValues(): EventFormValues {
  const startsAt = nextSaturdayAt(15);
  return {
    slug: "",
    title: "",
    excerpt: "Games, challenges, competition, Scripture, and brotherhood.",
    description:
      "Join us for games, challenges, and competition.\n\nWe’ll talk about discipline, character, and how to live a Godly life in Christ.",
    locationName: "Venue to be announced",
    city: "Virginia Beach",
    state: "VA",
    postalCode: "23451",
    startsAt,
    endsAt: startsAt + 3 * 60 * 60 * 1000,
    enrollmentOpensAt: startsAt - 14 * 24 * 60 * 60 * 1000,
    registrationClosesAt: startsAt,
    capacity: 30,
    lowCapacityThreshold: 5,
    status: "draft",
  };
}

function nextSaturdayAt(hour: number) {
  const date = new Date();
  const daysUntilSaturday = (6 - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilSaturday);
  date.setHours(hour, 0, 0, 0);
  return date.getTime();
}

function toLocalInput(timestamp: number) {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(timestamp - offset).toISOString().slice(0, 16);
}

function toTimestamp(value: FormDataEntryValue | null) {
  const timestamp = new Date(String(value ?? "")).getTime();
  if (!Number.isFinite(timestamp)) throw new Error("Enter a valid date and time.");
  return timestamp;
}

function optionalString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readableError(cause: unknown) {
  if (cause instanceof Error) {
    return cause.message
      .replace(/^[\s\S]*Uncaught (?:ConvexError|Error):\s*/, "")
      .split("\n")[0];
  }
  return "We could not save this event. Please try again.";
}
