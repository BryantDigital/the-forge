import type { Metadata } from "next";
import Link from "next/link";
import { ForgeFooter, ForgeHeader, SectionEyebrow } from "../components";
import { getPublishedEvents } from "../../lib/events";
import { HomeMotion } from "../home-motion";

export const metadata: Metadata = {
  title: "Upcoming Events",
  description: "Upcoming Forge events for boys ages 9–16 in Virginia Beach.",
};

export default async function EventsPage() {
  const upcomingEvents = await getPublishedEvents();
  return (
    <>
      <HomeMotion />
      <ForgeHeader />
      <main>
        <header className="interior-header">
          <div className="shell">
            <SectionEyebrow>Get in the arena</SectionEyebrow>
            <h1>Upcoming events</h1>
            <p>
              Free monthly events built around hard work, competition, practical
              skills, Scripture, and brotherhood.
            </p>
          </div>
        </header>
        <section className="event-promises" aria-label="About Forge events">
          <div className="shell event-promises__grid">
            <div><strong>Always free</strong><span>No ticket or fee</span></div>
            <div><strong>Boys ages 9–16</strong><span>Age range is informational</span></div>
            <div><strong>Virginia Beach</strong><span>Monthly local events</span></div>
            <div><strong>Stay informed</strong><span>Email and text alerts</span></div>
          </div>
        </section>
        <section className="section section--interior">
          <div className="shell">
            <div className="events-heading" data-reveal>
              <div>
                <SectionEyebrow>Next up</SectionEyebrow>
                <h2>Show up ready.</h2>
              </div>
              <p>
                Registration is free and parent accounts are optional. Join the
                notification list now and we&apos;ll contact you by email, text, or both.
              </p>
            </div>
            {upcomingEvents.map((event) => (
              <article className="featured-event" data-reveal key={event.slug}>
                <Link className="featured-event__media" href={`/events/${event.slug}`}>
                  <img src={event.image} alt="Forge boys and coaches gathering for an event" />
                  <span className={`status status--${event.status}`}>
                    {eventStatusLabel(event)}
                  </span>
                  <div className="featured-event__date">
                    <span>{event.month}</span>
                    <strong>{event.day}</strong>
                    <small>{event.year ?? "2026"}</small>
                  </div>
                </Link>
                <div className="featured-event__content">
                  <p className="event-card__meta">{event.time} ET · {event.locationShort}</p>
                  <h3><Link href={`/events/${event.slug}`}>{event.title}</Link></h3>
                  <p>{event.excerpt}</p>
                  <div className="featured-event__details">
                    <div><span>Cost</span><strong>Free</strong></div>
                    <div><span>Capacity</span><strong>{event.capacity} boys</strong></div>
                    <div><span>Status</span><strong>{eventStatusLabel(event)}</strong></div>
                  </div>
                  <div className="featured-event__actions">
                    <Link className="button button--red" href={`/events/${event.slug}`}>
                      View event details
                    </Link>
                    <span>Email + SMS alerts available</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="event-expectations section section--dark">
          <div className="shell">
            <div className="section-heading" data-reveal>
              <SectionEyebrow>What to expect</SectionEyebrow>
              <h2>Come ready to work.</h2>
              <p>Every event combines physical challenge with biblical formation.</p>
            </div>
            <div className="expectation-grid">
              <article data-reveal><span>01</span><h3>Compete</h3><p>Games, obstacle courses, and strength-based team challenges.</p></article>
              <article className="reveal-delay-1" data-reveal><span>02</span><h3>Build character</h3><p>Coaches call out integrity, grit, humility, and leadership in real time.</p></article>
              <article className="reveal-delay-2" data-reveal><span>03</span><h3>Follow Christ</h3><p>Short Scripture-based teaching connects the Gospel to everyday challenges.</p></article>
            </div>
          </div>
        </section>
      </main>
      <ForgeFooter />
    </>
  );
}

function eventStatusLabel(event: (Awaited<ReturnType<typeof getPublishedEvents>>)[number]) {
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
  return "Registration open";
}
