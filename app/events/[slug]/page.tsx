import type { Metadata } from "next";
import Link from "next/link";
import { ForgeFooter, ForgeHeader, SectionEyebrow } from "../../components";
import { upcomingEvents } from "../../data";

export const metadata: Metadata = {
  title: "The Forge — September 12",
};

export default function EventDetailPage() {
  const event = upcomingEvents[0];
  return (
    <>
      <ForgeHeader />
      <main>
        <header className="interior-header">
          <div className="shell">
            <SectionEyebrow>{event.dateLabel}</SectionEyebrow>
            <h1>{event.title}</h1>
            <p>{event.time} · {event.location}</p>
          </div>
        </header>
        <section className="section section--interior">
          <div className="shell content-grid">
            <article>
              <SectionEyebrow>About this event</SectionEyebrow>
              <h2>Challenge accepted.</h2>
              {event.description.map((paragraph) => <p className="lede" key={paragraph}>{paragraph}</p>)}
              <img src={event.image} alt="Forge boys and coaches at an event" />
              <div style={{ height: 34 }} />
              <h3>Come prepared</h3>
              <p>
                Wear your Forge shirt, bring a water bottle and Bible, and arrive
                ready to work. First-time participants will receive additional
                instructions before the event.
              </p>
            </article>
            <aside className="panel">
              <h3>Event details</h3>
              <div className="detail-list">
                <div><span>Date</span><strong>{event.dateLabel}</strong></div>
                <div><span>Time</span><strong>{event.time} ET</strong></div>
                <div><span>Location</span><strong>{event.location}</strong></div>
                <div><span>Cost</span><strong>Free</strong></div>
                <div><span>Capacity</span><strong>{event.capacity} boys</strong></div>
              </div>
              <div style={{ height: 26 }} />
              <div className="notice">
                <strong>Registration opens September 1.</strong>
                <p style={{ margin: "6px 0 0" }}>
                  Join the event notification list and we&apos;ll email you when spots open.
                </p>
              </div>
              <div style={{ height: 18 }} />
              <form className="field-grid">
                <label className="field field--full">
                  <span>Email address</span>
                  <input className="form-control" type="email" placeholder="parent@example.com" />
                </label>
                <button className="button button--red field--full" type="submit">Notify me</button>
              </form>
              <div style={{ height: 14 }} />
              <Link className="text-link" href="/events">← All events</Link>
            </aside>
          </div>
        </section>
      </main>
      <ForgeFooter />
    </>
  );
}
