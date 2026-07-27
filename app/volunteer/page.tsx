import type { Metadata } from "next";
import { ForgeFooter, ForgeHeader, SectionEyebrow } from "../components";

export const metadata: Metadata = { title: "Volunteer" };

const roles = [
  {
    title: "Forge Coach",
    details: [
      {
        label: "Role",
        text: "Lead boys through warm-ups, obstacle courses, and strength-based team challenges. Must be able to actively participate and demonstrate the exercises alongside them.",
      },
      {
        label: "Ideal For",
        text: "Former/current military, athletes, or fitness-minded volunteers.",
      },
      {
        label: "Required",
        text: "Coaches must review and affirm The Forge's Statement of Faith and core values by modeling the character, conduct, and biblical values of a follower of Jesus Christ.",
      },
    ],
  },
  {
    title: "The Watchman",
    details: [
      {
        label: "Role",
        text: "Observe and recognize boys living out core values during physical activities and competitions. Celebrate those showing integrity, grit, humility, leadership, and more. Quickly address integrity violations when necessary.",
      },
      {
        label: "Ideal For",
        text: "Volunteers who are observant, good with names and faces, and comfortable identifying and calling out both positive and negative behaviors.",
      },
      {
        label: "Required",
        text: "Watchmen must review and affirm The Forge's Statement of Faith and core values by modeling the character, conduct, and biblical values of a follower of Jesus Christ.",
      },
    ],
  },
  {
    title: "Set-Up & Break-Down Volunteers",
    details: [
      {
        label: "Role",
        text: "Arrive early to set up stations, cones, signs, gear, and equipment. Assist with parking and the general flow of traffic.",
      },
      {
        label: "Ideal For",
        text: "Volunteers who love to show up early or have time to stay after.",
      },
      {
        label: "Good to know",
        text: "You don't have to stay for the whole event.",
      },
    ],
  },
  {
    title: "Check-In / Greeter",
    details: [
      {
        label: "Role",
        text: "Greet families and track attendance. Coordinate check-ins and carpool if needed. Provide a Bible and shirt for new boys.",
      },
      {
        label: "Ideal For",
        text: "A regular of The Forge events who has an overall understanding of our mission and standard operating procedures.",
      },
    ],
  },
  {
    title: "Media Volunteer",
    details: [
      {
        label: "Role",
        text: "Take photos and videos during events using Forge-approved equipment. Capture moments that highlight effort, growth, and energy.",
      },
      {
        label: "Note",
        text: "Media volunteers must adhere to media policy and privacy rules.",
      },
    ],
  },
  {
    title: "Grill Master",
    details: [
      {
        label: "Role",
        text: "Operate the grill to prepare and serve burgers and dogs.",
      },
      {
        label: "Ideal For",
        text: "A man who can stand the heat and pressure of hangry young men.",
      },
    ],
  },
  {
    title: "Pastoral Teacher",
    details: [
      {
        label: "Role",
        text: "Help teach short Scripture-based messages that connect to real-life challenges boys face with the Gospel of Jesus Christ.",
      },
      {
        label: "Required",
        text: "Must be spiritually mature and strong in their walk with Christ and affirm The Forge's Statement of Faith and core values by modeling the character, conduct, and biblical values of a follower of Jesus Christ.",
      },
    ],
  },
  {
    title: "Community Service Volunteer",
    details: [
      {
        label: "Role",
        text: "Support community events hosted by The Forge. This position is open to all Forge family members—moms, dads, aunts, uncles, siblings, and more.",
      },
      {
        label: "Ideal For",
        text: "Anyone who wants to make a positive impact in our community and represent The Forge.",
      },
    ],
  },
];

const statementOfFaith = [
  {
    title: "Scripture",
    belief: "We believe the Bible is the inspired, inerrant, and authoritative Word of God.",
    reference: "2 Timothy 3:16; Psalm 119:105",
  },
  {
    title: "God",
    belief: "We confess the triune God: Father, Son, and Holy Spirit.",
    reference: "Matthew 28:19; 2 Corinthians 13:14",
  },
  {
    title: "Christ",
    belief: "We believe in the saving work of Jesus Christ, who lived a sinless life, died for our sins, and rose again.",
    reference: "1 Corinthians 15:3–4; John 1:14; Romans 5:8",
  },
  {
    title: "Salvation",
    belief: "We believe salvation is a gift of God's grace, received through faith alone in Jesus Christ.",
    reference: "Ephesians 2:8–9; John 3:16",
  },
  {
    title: "New Birth",
    belief: "We believe that in order to be saved, one must be born again through faith in Jesus Christ.",
    reference: "John 3:3; John 3:5",
  },
  {
    title: "Church Mission",
    belief: "We believe the Church exists to glorify God by making disciples, equipping believers, and living faithfully according to His Word.",
    reference: "Matthew 28:19–20; Ephesians 4:11–12",
  },
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

        <section className="section section--interior">
          <form className="shell content-grid volunteer-layout">
            <article>
              <div className="form-section form-section--first">
                <SectionEyebrow>Volunteer application</SectionEyebrow>
                <h2>Bring what you have.</h2>
                <p className="lede volunteer-lede">
                  Choose the areas where your skills and experience can make the
                  biggest impact. A representative from The Forge will contact
                  you with more information.
                </p>
                <div className="field-grid">
                  <label className="field"><span>First name</span><input className="form-control" required /></label>
                  <label className="field"><span>Last name</span><input className="form-control" required /></label>
                  <label className="field"><span>Email address</span><input className="form-control" type="email" required /></label>
                  <label className="field"><span>Mobile number</span><input className="form-control" type="tel" required /></label>
                </div>
              </div>

              <div className="form-section">
                <SectionEyebrow>Step into the mission</SectionEyebrow>
                <h2>Select all positions that apply.</h2>
                <p className="volunteer-intro">
                  Every role at The Forge serves a purpose—whether it&apos;s leading
                  from the front, supporting behind the scenes, or calling out
                  character in the heat of competition. Choose the areas where
                  your skills and experience can make the biggest impact.
                </p>
                <div className="volunteer-role-list">
                  {roles.map((role) => (
                    <label className="volunteer-role-card" key={role.title}>
                      <div>
                        <h3>{role.title}</h3>
                        {role.details.map((detail) => (
                          <p key={detail.label}>
                            <strong>{detail.label}:</strong> {detail.text}
                          </p>
                        ))}
                      </div>
                      <span className="volunteer-role-card__choice">
                        <input type="checkbox" name="roles" value={role.title} />
                        <span>Sign me up</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <SectionEyebrow>Required affirmation</SectionEyebrow>
                <h2>Statement of Faith</h2>
                <div className="faith-list">
                  {statementOfFaith.map((item) => (
                    <div className="faith-item" key={item.title}>
                      <h3>{item.title}</h3>
                      <p>{item.belief}</p>
                      <small>Reference: {item.reference}</small>
                    </div>
                  ))}
                </div>
                <label className="checkbox-row affirmation">
                  <input type="checkbox" required />
                  <span>I support and affirm this Statement of Faith.</span>
                </label>
              </div>

              <div className="form-section">
                <SectionEyebrow>Tell us about you</SectionEyebrow>
                <label className="field field--full">
                  <span>Who is Jesus to you?</span>
                  <small>
                    Whether you&apos;ve known Him your whole life or are just
                    starting to learn about Him, what does Jesus mean to you today?
                  </small>
                  <textarea className="form-control" required />
                </label>
                <label className="checkbox-row affirmation">
                  <input type="checkbox" required />
                  <span>I am willing to undergo a background check if required for my volunteer role.</span>
                </label>
                <button className="button button--red submit-button" type="submit">
                  Submit application
                </button>
              </div>
            </article>

            <aside className="panel volunteer-aside">
              <h3>What happens next?</h3>
              <div className="detail-list">
                <div><span>01</span><strong>Submit your interests</strong></div>
                <div><span>02</span><strong>A Forge leader reviews your application</strong></div>
                <div><span>03</span><strong>We contact you with the right next step</strong></div>
              </div>
              <div className="aside-note">
                <strong>Questions?</strong>
                <p>Email <a href="mailto:info@forgeva.com">info@forgeva.com</a>.</p>
              </div>
            </aside>
          </form>
        </section>
      </main>
      <ForgeFooter />
    </>
  );
}
