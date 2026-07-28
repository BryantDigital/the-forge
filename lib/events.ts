import { fetchQuery } from "convex/nextjs";
import { api } from "../convex/_generated/api";
import { type EventStatus, type ForgeEvent, upcomingEvents } from "../app/data";

type ConvexEvent = Awaited<ReturnType<typeof fetchQuery<typeof api.events.listPublished>>>[number];

export async function getPublishedEvents(): Promise<ForgeEvent[]> {
  try {
    const events = await fetchQuery(api.events.listPublished, {});
    return events.length > 0 ? events.map(toForgeEvent) : upcomingEvents;
  } catch {
    return upcomingEvents;
  }
}

export async function getPublishedEvent(slug: string): Promise<ForgeEvent | null> {
  try {
    const event = await fetchQuery(api.events.getPublishedBySlug, { slug });
    if (event) {
      return toForgeEvent(event);
    }
  } catch {
    // The static launch event remains available while a deployment is being configured.
  }

  return upcomingEvents.find((event) => event.slug === slug) ?? null;
}

function toForgeEvent(event: ConvexEvent): ForgeEvent {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const dateParts = easternDateParts(start);
  const registrationDate = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
  }).format(event.enrollmentOpensAt);
  const address = [
    event.locationName,
    event.addressLine1,
    event.addressLine2,
    [event.city, event.state].filter(Boolean).join(", "),
    event.postalCode,
  ].filter(Boolean);

  return {
    id: event._id,
    slug: event.slug,
    title: event.title,
    excerpt: event.excerpt,
    description: event.description.split(/\n{2,}/).filter(Boolean),
    dateLabel: new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(start),
    month: dateParts.month,
    day: dateParts.day,
    year: dateParts.year,
    time: `${formatEasternTime(start)}–${formatEasternTime(end)}`,
    location: address.join(" · "),
    locationShort: event.city,
    image: event.imageUrl,
    capacity: event.capacity,
    registered: event.registered,
    waitlisted: event.waitlisted,
    remaining: event.remaining,
    lowCapacityThreshold: event.lowCapacityThreshold,
    status: publicStatus(event),
    registrationLabel: registrationDate,
    enrollmentOpensAt: event.enrollmentOpensAt,
    registrationClosesAt: event.registrationClosesAt,
  };
}

function publicStatus(event: ConvexEvent): EventStatus {
  const now = Date.now();
  if (event.status === "cancelled") return "cancelled";
  if (event.status === "completed" || now >= event.registrationClosesAt) return "closed";
  if (event.remaining <= 0) return "full";
  if (now < event.enrollmentOpensAt) return "scheduled";
  return "open";
}

function easternDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const find = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return { month: find("month").toUpperCase(), day: find("day"), year: find("year") };
}

function formatEasternTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
