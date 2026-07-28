import type { Metadata } from "next";
import { ForgeFooter, ForgeHeader, SectionEyebrow } from "../components";
import { VolunteerDashboard } from "./volunteer-dashboard";

export const metadata: Metadata = { title: "Volunteer Dashboard" };

export default function VolunteerDashboardPage() {
  return (
    <>
      <ForgeHeader />
      <main>
        <header className="interior-header volunteer-portal-hero">
          <div className="shell">
            <SectionEyebrow>Volunteer command post</SectionEyebrow>
            <h1>Raise your hand. Show up ready.</h1>
            <p>See where The Forge needs you and commit to the next mission.</p>
          </div>
        </header>
        <section className="section section--interior">
          <div className="shell">
            <VolunteerDashboard />
          </div>
        </section>
      </main>
      <ForgeFooter />
    </>
  );
}
