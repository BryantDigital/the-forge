import type { Metadata } from "next";
import Link from "next/link";
import { ForgeFooter, ForgeHeader, SectionEyebrow } from "../components";

export const metadata: Metadata = { title: "My Forge" };

export default function AccountPage() {
  return (
    <>
      <ForgeHeader />
      <main>
        <header className="interior-header">
          <div className="shell">
            <SectionEyebrow>My Forge</SectionEyebrow>
            <h1>Your family. One place.</h1>
            <p>Access saved children, upcoming registrations, event history, and giving.</p>
          </div>
        </header>
        <section className="section">
          <div className="shell" style={{ maxWidth: 700 }}>
            <div className="panel">
              <h2 style={{ fontSize: "2.7rem" }}>Email me a secure sign-in link.</h2>
              <p>
                No password required. Use the email address from your event
                registration or donation and we&apos;ll connect your history automatically.
              </p>
              <form className="field-grid">
                <label className="field field--full">
                  <span>Email address</span>
                  <input className="form-control" type="email" placeholder="parent@example.com" />
                </label>
                <button className="button button--red field--full" type="submit">Send sign-in link</button>
              </form>
              <p style={{ margin: "18px 0 0" }}>
                Looking for an RSVP? Your confirmation email also contains a
                secure link to edit or cancel it without signing in.
              </p>
              <Link className="text-link" href="/events">View upcoming events →</Link>
            </div>
          </div>
        </section>
      </main>
      <ForgeFooter />
    </>
  );
}
