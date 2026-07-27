import type { Metadata } from "next";
import { EventCard, ForgeFooter, ForgeHeader, SectionEyebrow } from "../components";
import { upcomingEvents } from "../data";

export const metadata: Metadata = {
  title: "Upcoming Events",
  description: "Upcoming Forge events for boys ages 9–16 in Virginia Beach.",
};

export default function EventsPage() {
  return (
    <>
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
        <section className="section section--interior">
          <div className="shell">
            <div className="event-grid">
              {upcomingEvents.map((event) => (
                <EventCard event={event} key={event.slug} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <ForgeFooter />
    </>
  );
}
