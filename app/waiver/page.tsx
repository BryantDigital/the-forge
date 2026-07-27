import type { Metadata } from "next";
import { ForgeFooter, ForgeHeader, SectionEyebrow } from "../components";

export const metadata: Metadata = { title: "Terms & Waiver" };

export default function WaiverPage() {
  return (
    <>
      <ForgeHeader />
      <main>
        <header className="interior-header">
          <div className="shell">
            <SectionEyebrow>Participant terms</SectionEyebrow>
            <h1>Terms & waiver</h1>
          </div>
        </header>
        <section className="section">
          <article className="shell" style={{ maxWidth: 820 }}>
            <h2 style={{ fontSize: "2.8rem" }}>Participation waiver</h2>
            <p>
              I give permission for my child to participate in this activity. I
              assume the risks incidental to participation and release The Forge
              Christian Ministries, property owners, and volunteer coaches from
              liability arising from injuries sustained while participating.
            </p>
            <p>
              I authorize program leaders to obtain necessary emergency medical
              care for injuries or illness affecting my child during the event.
            </p>
            <h2 style={{ fontSize: "2.8rem", marginTop: 50 }}>Photo and media release</h2>
            <p>
              By registering my child, I grant The Forge permission to capture
              and use my child&apos;s image, likeness, or voice for lawful promotional,
              educational, and marketing purposes related to its mission.
            </p>
            <p>
              A complete versioned copy of these terms is presented and accepted
              during every event registration.
            </p>
          </article>
        </section>
      </main>
      <ForgeFooter />
    </>
  );
}
