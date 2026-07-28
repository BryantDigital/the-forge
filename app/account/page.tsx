import type { Metadata } from "next";
import Link from "next/link";
import { ForgeFooter, ForgeHeader, SectionEyebrow } from "../components";
import { AuthCard } from "./auth-card";

export const metadata: Metadata = { title: "Login / Sign up" };

export default function AccountPage() {
  return (
    <>
      <ForgeHeader />
      <main>
        <header className="interior-header">
          <div className="shell">
            <SectionEyebrow>Login / Sign up</SectionEyebrow>
            <h1>Your family. One place.</h1>
            <p>Access saved children, upcoming registrations, event history, and giving.</p>
          </div>
        </header>
        <section className="section section--interior">
          <div className="shell account-page-shell">
            <AuthCard />
            <div className="account-page-aside">
              <SectionEyebrow>No login required</SectionEyebrow>
              <h2>RSVP without slowing down.</h2>
              <p>
                Parents can still register children, join waitlists, and receive
                event alerts with only their contact information.
              </p>
              <Link className="text-link" href="/events">
                View upcoming events →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <ForgeFooter />
    </>
  );
}
