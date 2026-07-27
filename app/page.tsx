import Link from "next/link";
import { EventCard, ForgeFooter, ForgeHeader, SectionEyebrow } from "./components";
import { forgeValues, upcomingEvents } from "./data";

export default function Home() {
  return (
    <>
      <ForgeHeader />
      <main>
        <section className="hero">
          <div className="hero__grain" />
          <div className="shell hero__content">
            <img className="hero__crest" src="/images/forge-crest.png" alt="" />
            <p className="hero__kicker">Boys ages 9–16 · Virginia Beach</p>
            <h1>Building boys into faithful men.</h1>
            <p className="hero__lead">
              Faith. Fitness. Fellowship. Fun. A brotherhood rooted in God&apos;s
              Word and forged through challenge.
            </p>
            <div className="button-row">
              <Link className="button button--red" href="/events">
                View upcoming events
              </Link>
              <Link className="button button--ghost" href="#mission">
                Our mission
              </Link>
            </div>
          </div>
          <div className="hero__rule">
            <span>Follow Christ</span>
            <span>Overcome challenges</span>
            <span>Endure with purpose</span>
          </div>
        </section>

        <section className="mission section" id="mission">
          <div className="shell split">
            <div className="split__copy">
              <SectionEyebrow>Our mission</SectionEyebrow>
              <h2>Strength with a foundation.</h2>
              <p className="lede">
                Our mission at The Forge is to inspire a generation of strong,
                resilient, fit, and faithful young men with a personal
                relationship with Jesus Christ.
              </p>
              <p>
                Rooted in God&apos;s Word, forged through challenging workouts,
                and sharpened through competitive games and brotherhood.
              </p>
              <blockquote>
                “Iron sharpens iron, and one man sharpens another.”
                <cite>Proverbs 27:17</cite>
              </blockquote>
            </div>
            <div className="photo-stack" aria-label="Forge boys and coaches">
              <img src="/images/forge-mission.jpg" alt="Forge participants training together" />
              <div className="photo-stack__badge">
                <strong>F·F·F·F</strong>
                <span>Faith · Fitness · Fellowship · Fun</span>
              </div>
            </div>
          </div>
        </section>

        <section className="values section section--dark">
          <div className="shell">
            <SectionEyebrow>What we stand for</SectionEyebrow>
            <div className="section-heading">
              <h2>F·O·R·G·E</h2>
              <p>A clear standard for the men we are becoming.</p>
            </div>
            <div className="value-grid">
              {forgeValues.map((value) => (
                <article className="value-card" key={value.letter}>
                  <span className="value-card__letter">{value.letter}</span>
                  <div>
                    <h3>{value.title}</h3>
                    <p className="value-card__line">{value.line}</p>
                    <p>{value.description}</p>
                    <small>{value.verse}</small>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section events-preview">
          <div className="shell">
            <div className="section-heading section-heading--row">
              <div>
                <SectionEyebrow>Get in the arena</SectionEyebrow>
                <h2>Upcoming events</h2>
              </div>
              <Link className="text-link" href="/events">
                View all events <span>→</span>
              </Link>
            </div>
            <div className="event-grid">
              {upcomingEvents.map((event) => (
                <EventCard event={event} key={event.slug} />
              ))}
            </div>
          </div>
        </section>

        <section className="brotherhood">
          <div className="brotherhood__image" />
          <div className="shell brotherhood__content">
            <SectionEyebrow>Show up. Get stronger.</SectionEyebrow>
            <h2>Every boy needs a brotherhood.</h2>
            <p>
              We train, compete, learn practical skills, study Scripture, and
              build friendships that sharpen boys into men of conviction.
            </p>
            <Link className="button button--red" href="/events">
              Find the next Forge
            </Link>
          </div>
        </section>

        <section className="newsletter section">
          <div className="shell newsletter__inner">
            <div>
              <SectionEyebrow>Stay in the loop</SectionEyebrow>
              <h2>New events. Forge updates. No noise.</h2>
              <p>Join the general Forge email list for announcements and new event dates.</p>
            </div>
            <form className="newsletter__form">
              <label>
                <span>First name</span>
                <input name="firstName" placeholder="First name" />
              </label>
              <label>
                <span>Last name</span>
                <input name="lastName" placeholder="Last name" />
              </label>
              <label className="newsletter__email">
                <span>Email address</span>
                <input name="email" type="email" placeholder="you@example.com" />
              </label>
              <button className="button button--red" type="submit">
                Join the list
              </button>
            </form>
          </div>
        </section>
      </main>
      <ForgeFooter />
    </>
  );
}
