# The Forge — Product Specification

## Product goal

Replace the current WordPress site with a rugged, Christ-centered Next.js
experience and a unified operational system for events, families, attendance,
volunteers, communications, and donations.

The public experience should feel strong, disciplined, and masculine without
using military imagery or leaning on the Navy SEAL backgrounds of its leaders.
The visual system uses black, charcoal, warm white, steel gray, and Forge red,
supported by real Forge photography.

## Release-one surfaces

### Public site

- Homepage with preserved mission, F.O.R.G.E. principles, imagery, upcoming
  events, newsletter form, volunteer and donation calls to action.
- Upcoming-events index.
- Event details with enrollment state, capacity state, venue, schedule, and
  registration-opening notification.
- Guest-first RSVP flow.
- Volunteer application.
- Stripe donation flow for one-time, monthly, quarterly, and annual giving.
- Versioned terms, participation waiver, emergency-medical authorization, and
  photo/media release.
- Passwordless My Forge portal.
- External Shopify link when the migrated store is ready.

### Parent and household experience

- RSVP requires parent first and last name, email, mobile phone, household
  emergency contact, and one or more children.
- Each child has first and last name, birth date, stated age, allergies, and
  notes.
- Ages 9–16 are informational and are not enforced.
- A parent does not need an account or password to register.
- Normalized verified email associates guest activity and adult members to one
  private household record.
- Confirmation email contains a signed, expiring management link.
- Secure links allow adding children, editing information, cancelling an
  individual child, or cancelling the entire reservation.
- Authenticated parents can reuse saved household and child details.
- Parents can create and update reusable child profiles independently of an
  event registration.
- A parent can invite a spouse or co-parent by email. After that adult verifies
  the exact invited email through passwordless login, both adults share the
  household, children, registrations, and household giving history.
- Editing a reusable child profile affects future registrations; historical
  event snapshots and rosters remain unchanged.
- Existing children are never exposed solely because an email was entered;
  verified email authentication is required.

### Capacity and waitlist

- Capacity counts active children, never adults or household records.
- Seat changes happen transactionally to prevent overselling.
- Registration closes at the event start time in America/New_York.
- Cards show `Only X spots left` at the event-configured threshold and `Full`
  at zero availability.
- A full event accepts complete-family waitlist requests.
- Waitlists are first-come-first-served.
- When seats open, the earliest complete request that fits receives a 24-hour
  offer and the matching seats are temporarily reserved.
- Expired offers release their seats and advance to the next complete request
  that fits.
- Partial cancellations immediately return seats and trigger waitlist
  evaluation.

### Communications

- Automatic registration confirmation.
- Automatic reminder seven days before the event.
- Automatic reminder at 8:00 AM Eastern on event day.
- Registration cancellation notification to administrators.
- Waitlist offer and expiration messaging.
- Admin-composed logistical email to registered event families.
- General newsletter consent remains separate from operational email.
- Parent mobile number is required.
- SMS consent is optional, unchecked, versioned, and timestamped.
- Event SMS is delivered through Twilio after explicit household consent.
- Registration-open and waitlist alerts can be delivered by email, SMS, or both.
- Admins can target registered families, waitlisted families, or everyone
  attached to an event and see opted-in recipient counts before sending.
- Convex is the authoritative event roster and communication audience.
- Twilio SendGrid delivers operational email and the general email list; the
  project has no Mailchimp dependency.

### Forge Admin

- One unified admin; staff do not use a separate CMS.
- Owner: full access, roles, events, registrations, attendance, volunteer
  submissions, communications, donations, and future reporting.
- Event manager: event creation/editing, registration, attendance, volunteers,
  and logistical communications.
- Check-in volunteer: event roster and attendance only.
- Dashboard with upcoming events, capacity, waitlist, volunteer activity, and
  attendance snapshots.
- Create and edit event title, description, image, venue, start/end time,
  enrollment opening, capacity, low-seat threshold, and publication state.
- Alphabetical child roster with per-child check-in.
- Attendance is durable and remains available after the event.
- Printable roster and CSV export.
- Audit trail for privileged changes.

### Volunteer workflow

- Public application stores a durable Convex record.
- Captures contact information, role interests, background-check willingness,
  statement-of-faith affirmation, and response to “Who is Jesus to you?”
- Sends Dave a basic notification containing a link to the admin submission.
- Admin tracks new, reviewing, contacted, and closed states.

### Donations

- Stripe Elements handles card and bank-account giving.
- Preset amounts: $10, $25, $50, $100, $250, and $500, plus custom amount.
- Frequencies: one-time, monthly, quarterly, and annual.
- Stripe remains authoritative for payment processing and subscription changes.
- Webhooks mirror giving records into Convex for the authenticated parent portal.
- My Forge links to Stripe Customer Portal for payment method, receipt, and
  subscription management.
- No WordPress/GiveWP history migration is required.

## Architecture

- Next.js App Router for public pages, parent portal, and Forge Admin.
- Convex for application records, transactions, scheduled workflows, file
  references, reporting queries, and audit data.
- Convex + Better Auth Email OTP for passwordless parents and role-protected
  staff. A verified email automatically creates the account on first login.
- Stripe Elements, Checkout/Payment Intents, Billing, Customer Portal, and
  signed webhooks.
- Twilio SendGrid for sign-in codes, confirmations, reminders, waitlist offers,
  general email subscriptions, and admin logistical messages.
- Twilio Messaging Services for registration-open alerts, waitlist offers,
  reminders, and admin-composed logistical SMS.
- SMS remains feature-flagged until Twilio credentials, sender registration,
  consent language, and delivery-status callbacks are configured.

## Data handling and safety

- Minimize minor data and never expose a child directory.
- Store allergies and notes per child; emergency contact belongs to household.
- Protect admin operations with server-side authorization on every function.
- Store only hashed RSVP management tokens.
- Version and timestamp waiver, newsletter, and SMS consent.
- Verify Stripe, Twilio, and SendGrid webhook signatures.
- Record privileged event, registration, attendance, and role changes.
- Provide retention and deletion procedures before production launch.

## Delivery milestones

1. Brand system, public pages, responsive navigation, and realistic event states.
2. Convex project, schema, event queries, transactional capacity, and uploads.
3. Guest RSVP, household association, signed management links, and waitlist.
4. Passwordless My Forge and role-based Forge Admin.
5. Check-in, print/CSV, volunteer pipeline, audit log, and reporting base.
6. Twilio SendGrid transactional email and audience segmentation.
7. Stripe donation form, webhooks, giving history, and Customer Portal.
8. SMS configuration, production security review, accessibility review,
   deployment, redirects, analytics, and launch.
