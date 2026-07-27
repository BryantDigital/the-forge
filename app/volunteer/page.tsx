import type { Metadata } from "next";
import { ForgeFooter, ForgeHeader, SectionEyebrow } from "../components";

export const metadata: Metadata = { title: "Volunteer" };

const roles = [
  "Forge Coach",
  "The Watchman",
  "Set-Up & Break-Down",
  "Check-In / Greeter",
  "Media Volunteer",
  "Grill Master",
  "Pastoral Teacher",
  "Community Service Volunteer",
];

export default function VolunteerPage() {
  return (
    <>
      <ForgeHeader />
      <main>
        <header className="interior-header">
          <div className="shell">
            <SectionEyebrow>Step into the mission</SectionEyebrow>
            <h1>Stand in the gap.</h1>
            <p>
              Every role serves a purpose—leading from the front, supporting
              behind the scenes, or calling out character in the heat of competition.
            </p>
          </div>
        </header>
        <section className="section">
          <div className="shell content-grid">
            <article>
              <SectionEyebrow>Volunteer application</SectionEyebrow>
              <h2>Bring what you have.</h2>
              <p className="lede">
                Tell us where your skills and experience can make the biggest
                impact. A Forge leader will follow up with next steps.
              </p>
              <form className="field-grid">
                <label className="field"><span>First name</span><input className="form-control" /></label>
                <label className="field"><span>Last name</span><input className="form-control" /></label>
                <label className="field"><span>Email address</span><input className="form-control" type="email" /></label>
                <label className="field"><span>Mobile number</span><input className="form-control" type="tel" /></label>
                <div className="field field--full">
                  <span>Roles that interest you</span>
                  {roles.map((role) => (
                    <label className="checkbox-row" key={role}>
                      <input type="checkbox" />
                      <span>{role}</span>
                    </label>
                  ))}
                </div>
                <label className="field field--full">
                  <span>Who is Jesus to you?</span>
                  <textarea className="form-control" />
                </label>
                <label className="checkbox-row field--full">
                  <input type="checkbox" />
                  <span>I support and affirm The Forge statement of faith.</span>
                </label>
                <label className="checkbox-row field--full">
                  <input type="checkbox" />
                  <span>I am willing to undergo a background check if required.</span>
                </label>
                <button className="button button--red field--full" type="submit">Submit application</button>
              </form>
            </article>
            <aside className="panel">
              <h3>What happens next?</h3>
              <div className="detail-list">
                <div><span>01</span><strong>Submit your interests</strong></div>
                <div><span>02</span><strong>A Forge leader reviews your application</strong></div>
                <div><span>03</span><strong>We contact you with the right next step</strong></div>
              </div>
              <div style={{ height: 28 }} />
              <p>
                Roles involving direct contact with boys may require a background
                check and affirmation of The Forge&apos;s statement of faith.
              </p>
            </aside>
          </div>
        </section>
      </main>
      <ForgeFooter />
    </>
  );
}
