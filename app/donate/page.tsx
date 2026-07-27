import type { Metadata } from "next";
import { ForgeFooter, ForgeHeader, SectionEyebrow } from "../components";

export const metadata: Metadata = { title: "Give" };

export default function DonatePage() {
  return (
    <>
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
        <section className="section">
          <div className="shell content-grid">
            <article>
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
              <img src="/images/forge-mission.jpg" alt="Forge participants working together" />
            </article>
            <aside className="panel">
              <h3>Make a donation</h3>
              <form className="field-grid">
                <label className="field field--full">
                  <span>Giving frequency</span>
                  <select className="form-control" defaultValue="monthly">
                    <option value="once">One time</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                </label>
                <div className="field field--full">
                  <span>Gift amount</span>
                  <div className="donation-amounts">
                    {[10, 25, 50, 100, 250, 500].map((amount) => (
                      <button className="choice" type="button" key={amount}>${amount}</button>
                    ))}
                    <button className="choice" type="button">Custom</button>
                  </div>
                </div>
                <label className="field">
                  <span>First name</span>
                  <input className="form-control" />
                </label>
                <label className="field">
                  <span>Last name</span>
                  <input className="form-control" />
                </label>
                <label className="field field--full">
                  <span>Email address</span>
                  <input className="form-control" type="email" />
                </label>
                <button className="button button--red field--full" type="submit">
                  Continue securely with Stripe
                </button>
              </form>
              <p style={{ margin: "16px 0 0", color: "var(--smoke)", fontSize: ".82rem" }}>
                Card and bank-account payments are securely processed by Stripe.
              </p>
            </aside>
          </div>
        </section>
      </main>
      <ForgeFooter />
    </>
  );
}
