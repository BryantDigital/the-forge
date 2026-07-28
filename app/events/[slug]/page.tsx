import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ForgeFooter, ForgeHeader, SectionEyebrow } from "../../components";
import { getPublishedEvent } from "../../../lib/events";
import { EventNotificationForm } from "../../event-notification-form";
import { HomeMotion } from "../../home-motion";

export const metadata: Metadata = { title: "Event Details" };

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getPublishedEvent(slug);
  if (!event) notFound();
  return (
    <>
      <HomeMotion />
      <ForgeHeader />
      <main>
        <header className="interior-header">
          <div className="shell">
            <SectionEyebrow>{event.dateLabel}</SectionEyebrow>
            <h1>{event.title}</h1>
            <p>{event.time} · {event.location}</p>
            <div className="event-header__tags">
              <span>Free event</span>
              <span>Boys ages 9–16</span>
              <span>Eastern time</span>
            </div>
          </div>
        </header>
        <section className="section section--interior">
          <div className="shell content-grid event-detail-layout">
            <article className="event-detail-copy">
              <div data-reveal>
                <SectionEyebrow>About this event</SectionEyebrow>
                <h2>Challenge accepted.</h2>
                {event.description.map((paragraph) => <p className="lede" key={paragraph}>{paragraph}</p>)}
              </div>
              <figure className="event-detail-image" data-reveal>
                <img src={event.image} alt="Forge boys and coaches at an event" />
                <figcaption>
                  <strong>Faith · Fitness · Fellowship · Fun</strong>
                  <span>Come ready to compete, learn, and grow.</span>
                </figcaption>
              </figure>
              <div className="event-preparation" data-reveal>
                <SectionEyebrow>Come prepared</SectionEyebrow>
                <h3>Bring what you need.</h3>
                <div className="preparation-grid">
                  <div><span>01</span><strong>Forge shirt</strong><p>First-time participants receive instructions before the event.</p></div>
                  <div><span>02</span><strong>Water bottle</strong><p>Arrive hydrated and ready for physical activity.</p></div>
                  <div><span>03</span><strong>Bible</strong><p>We’ll spend time together in God&apos;s Word.</p></div>
                </div>
              </div>
            </article>
            <aside className="event-action-card">
              <div className="event-action-card__status">
                <span className="status-dot" />
                {eventStatusLabel(event)}
              </div>
              <div className="event-action-card__details">
                <h3>Event details</h3>
                <div className="detail-list">
                  <div><span>Date</span><strong>{event.dateLabel}</strong></div>
                  <div><span>Time</span><strong>{event.time} ET</strong></div>
                  <div><span>Location</span><strong>{event.location}</strong></div>
                  <div><span>Cost</span><strong>Free</strong></div>
                  <div><span>Capacity</span><strong>{event.capacity} boys</strong></div>
                </div>
              </div>
              {event.status === "open" || event.status === "full" ? (
                <div className="event-registration-cta">
                  <p>
                    {event.status === "full"
                      ? "Join the family waitlist. We’ll only offer seats when your entire request fits."
                      : `${event.remaining ?? event.capacity} spots are currently available.`}
                  </p>
                  <Link className="button button--red" href={`/events/${event.slug}/register`}>
                    {event.status === "full" ? "Join the waitlist" : "Register boys"}
                  </Link>
                  <small>No account or password required.</small>
                </div>
              ) : event.status === "scheduled" ? (
                <EventNotificationForm
                  mode="registration"
                  eventSlug={event.slug}
                  registrationLabel={event.registrationLabel}
                />
              ) : (
                <div className="event-registration-cta">
                  <p>
                    {event.status === "cancelled"
                      ? "This event has been cancelled."
                      : "Registration for this event is closed."}
                  </p>
                </div>
              )}
              <div className="event-action-card__footer">
                <Link className="text-link" href="/events">← All events</Link>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <ForgeFooter />
    </>
  );
}

function eventStatusLabel(event: NonNullable<Awaited<ReturnType<typeof getPublishedEvent>>>) {
  if (event.status === "scheduled") return `Registration opens ${event.registrationLabel}`;
  if (event.status === "full") return "Event full · waitlist open";
  if (event.status === "closed") return "Registration closed";
  if (event.status === "cancelled") return "Event cancelled";
  if (
    event.remaining !== undefined &&
    event.lowCapacityThreshold !== undefined &&
    event.remaining <= event.lowCapacityThreshold
  ) {
    return `Only ${event.remaining} spots left`;
  }
  return "Registration is open";
}
