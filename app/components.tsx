import Link from "next/link";
import type { ForgeEvent } from "./data";

export function ForgeHeader() {
  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link className="site-header__brand" href="/" aria-label="The Forge home">
          <img src="/images/forge-logo.png" alt="The Forge" />
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          <Link href="/events">Events</Link>
          <Link href="/volunteer">Volunteer</Link>
          <Link href="/donate">Donate</Link>
          <Link href="/account">My Forge</Link>
        </nav>
        <Link className="button button--red button--small site-header__cta" href="/events">
          Find an event
        </Link>
        <details className="mobile-menu">
          <summary aria-label="Open menu">Menu</summary>
          <nav>
            <Link href="/events">Events</Link>
            <Link href="/volunteer">Volunteer</Link>
            <Link href="/donate">Donate</Link>
            <Link href="/account">My Forge</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function ForgeFooter() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__grid">
        <div>
          <img className="site-footer__logo" src="/images/forge-logo.png" alt="The Forge" />
          <p>Building boys into faithful men through faith, fitness, fellowship, and fun.</p>
        </div>
        <div>
          <h3>Take action</h3>
          <Link href="/events">Upcoming events</Link>
          <Link href="/volunteer">Volunteer</Link>
          <Link href="/donate">Give to The Forge</Link>
        </div>
        <div>
          <h3>Information</h3>
          <Link href="/waiver">Terms & waiver</Link>
          <a href="mailto:info@forgeva.com">info@forgeva.com</a>
          <Link href="/admin">Forge Admin</Link>
        </div>
      </div>
      <div className="shell site-footer__bottom">
        <span>© {new Date().getFullYear()} The Forge Christian Ministries</span>
        <span>Registered 501(c)(3) nonprofit organization</span>
      </div>
    </footer>
  );
}

export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function EventCard({ event }: { event: ForgeEvent }) {
  const remaining = event.capacity - event.registered;
  return (
    <article className="event-card">
      <Link className="event-card__image" href={`/events/${event.slug}`}>
        <img src={event.image} alt="" />
        <span className={`status status--${event.status}`}>
          {event.status === "scheduled"
            ? `Registration opens ${event.registrationLabel}`
            : event.status === "full"
              ? "Event full"
              : remaining <= 5
                ? `Only ${remaining} spots left`
                : "Registration open"}
        </span>
      </Link>
      <div className="event-card__body">
        <div className="date-block" aria-label={event.dateLabel}>
          <span>{event.month}</span>
          <strong>{event.day}</strong>
        </div>
        <div>
          <p className="event-card__meta">{event.time} · {event.locationShort}</p>
          <h3><Link href={`/events/${event.slug}`}>{event.title}</Link></h3>
          <p>{event.excerpt}</p>
          <Link className="text-link" href={`/events/${event.slug}`}>
            Event details <span>→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
