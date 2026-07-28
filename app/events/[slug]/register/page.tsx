import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedEvent } from "../../../../lib/events";
import { ForgeFooter, ForgeHeader, SectionEyebrow } from "../../../components";
import { RegistrationForm } from "./registration-form";

export const metadata: Metadata = { title: "Register for The Forge" };

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getPublishedEvent(slug);
  if (!event) notFound();

  return (
    <>
      <ForgeHeader />
      <main>
        <header className="interior-header">
          <div className="shell">
            <SectionEyebrow>
              Free registration · {event.remaining ?? event.capacity} spots remaining
            </SectionEyebrow>
            <h1>{event.status === "full" ? "Join the waitlist." : "Reserve their place."}</h1>
            <p>{event.title} · {event.time} Eastern</p>
          </div>
        </header>
        <section className="section section--interior">
          {event.status === "open" || event.status === "full" ? (
            <RegistrationForm
              eventSlug={event.slug}
              eventTitle={event.title}
              mode={event.status === "full" ? "waitlist" : "registration"}
              remaining={event.remaining ?? event.capacity}
            />
          ) : (
            <div className="shell panel registration-unavailable">
              <h2>Registration is not currently open.</h2>
              <p>
                Return to the event page for registration-opening alerts and the latest details.
              </p>
            </div>
          )}
        </section>
      </main>
      <ForgeFooter />
    </>
  );
}
