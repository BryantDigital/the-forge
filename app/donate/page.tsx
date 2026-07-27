import type { Metadata } from "next";
import { ForgeFooter, ForgeHeader, SectionEyebrow } from "../components";
import { DonationForm } from "../donation-form";
import { HomeMotion } from "../home-motion";

export const metadata: Metadata = { title: "Give" };

export default function DonatePage() {
  return (
    <>
      <HomeMotion />
      <ForgeHeader />
      <main>
        <header className="interior-header">
          <div className="shell">
            <SectionEyebrow>Fuel the mission</SectionEyebrow>
            <h1>Forge the next generation.</h1>
            <p>
              Your gift creates spaces where boys are challenged, encouraged,
              and grounded in a lasting relationship with Jesus Christ.
            </p>
          </div>
        </header>
        <section className="section section--interior">
          <div className="shell content-grid donation-layout">
            <article className="giving-copy" data-reveal>
              <SectionEyebrow>100% secure giving</SectionEyebrow>
              <h2>Every gift matters.</h2>
              <p className="lede">
                Give once or build lasting momentum through monthly, quarterly,
                or annual support.
              </p>
              <p>
                The Forge Christian Ministries is a registered 501(c)(3)
                nonprofit. Donations are tax-deductible as allowed by law.
              </p>
              <div className="donation-media">
                <img src="/images/forge-mission.jpg" alt="Forge participants working together" />
                <div className="donation-media__quote">
                  <strong>Invest in boys.<br />Strengthen families.<br />Forge faithful men.</strong>
                </div>
              </div>
              <div className="giving-assurances">
                <div>
                  <strong>501(c)(3)</strong>
                  <span>Tax-deductible giving</span>
                </div>
                <div>
                  <strong>Direct impact</strong>
                  <span>Fueling events and mentorship</span>
                </div>
                <div>
                  <strong>Flexible</strong>
                  <span>Give once or build momentum</span>
                </div>
              </div>
            </article>
            <DonationForm />
          </div>
        </section>
      </main>
      <ForgeFooter />
    </>
  );
}
