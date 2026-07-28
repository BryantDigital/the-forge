import type { Metadata } from "next";
import { ForgeFooter, ForgeHeader, SectionEyebrow } from "../../../components";

export const metadata: Metadata = { title: "Register for The Forge" };

export default function RegisterPage() {
  return (
    <>
      <ForgeHeader />
      <main>
        <header className="interior-header">
          <div className="shell">
            <SectionEyebrow>Free registration · 5 spots remaining</SectionEyebrow>
            <h1>Reserve their place.</h1>
            <p>The Forge — September 12 · 3:00–6:00 PM Eastern</p>
          </div>
        </header>
        <section className="section section--interior">
          <form className="shell content-grid">
            <div>
              <SectionEyebrow>Parent or guardian</SectionEyebrow>
              <h2>Start with you.</h2>
              <div className="field-grid">
                <label className="field"><span>First name</span><input className="form-control" required /></label>
                <label className="field"><span>Last name</span><input className="form-control" required /></label>
                <label className="field"><span>Email address</span><input className="form-control" type="email" required /></label>
                <label className="field"><span>Mobile number</span><input className="form-control" type="tel" required /></label>
                <label className="field"><span>Emergency contact name</span><input className="form-control" required /></label>
                <label className="field"><span>Emergency contact phone</span><input className="form-control" type="tel" required /></label>
              </div>
              <div style={{ height: 54 }} />
              <SectionEyebrow>Participant 1</SectionEyebrow>
              <h2>Who is coming?</h2>
              <div className="field-grid">
                <label className="field"><span>First name</span><input className="form-control" required /></label>
                <label className="field"><span>Last name</span><input className="form-control" required /></label>
                <label className="field"><span>Birth date</span><input className="form-control" type="date" required /></label>
                <label className="field"><span>Age</span><input className="form-control" type="number" min="1" max="21" required /></label>
                <label className="field field--full"><span>Allergies</span><input className="form-control" placeholder="None, or describe allergies" /></label>
                <label className="field field--full"><span>Notes</span><textarea className="form-control" placeholder="Anything the Forge team should know" /></label>
              </div>
              <div style={{ height: 18 }} />
              <button className="choice" type="button" style={{ padding: "0 18px" }}>+ Add another child</button>
            </div>
            <aside className="panel">
              <h3>Your reservation</h3>
              <div className="detail-list">
                <div><span>Event</span><strong>The Forge — September 12</strong></div>
                <div><span>Children</span><strong>1 spot</strong></div>
                <div><span>Cost</span><strong>Free</strong></div>
              </div>
              <div style={{ height: 24 }} />
              <label className="checkbox-row">
                <input type="checkbox" required />
                <span>
                  I agree to the participation waiver, emergency medical
                  authorization, and photo and media release for every child on this registration.
                </span>
              </label>
              <div style={{ height: 16 }} />
              <label className="checkbox-row">
                <input type="checkbox" />
                <span>
                  Text me registration updates and event reminders. Message and
                  data rates may apply. Reply STOP to unsubscribe.
                </span>
              </label>
              <div style={{ height: 16 }} />
              <label className="checkbox-row">
                <input type="checkbox" />
                <span>Also add me to the general Forge email list.</span>
              </label>
              <div style={{ height: 24 }} />
              <button className="button button--red" type="submit" style={{ width: "100%" }}>
                Complete registration
              </button>
              <p style={{ margin: "15px 0 0", color: "var(--smoke)", fontSize: ".82rem" }}>
                No account or password required. We&apos;ll email a secure link to
                edit or cancel this registration. Your email will connect the RSVP
                to your account whenever you choose to sign in with a one-time code.
              </p>
            </aside>
          </form>
        </section>
      </main>
      <ForgeFooter />
    </>
  );
}
