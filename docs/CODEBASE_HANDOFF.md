# The Forge — Codebase Memory and Engineering Handoff

Last verified: July 28, 2026  
Repository: `https://github.com/BryantDigital/the-forge`  
Primary branch: `main`  
Current production preview: `https://the-forge-sooty-nine.vercel.app`  
Convex production deployment: `mild-swordfish-582`

This document is the durable context file for a new coding agent or a future
development session. Read it before changing the application. Then inspect the
current source and Git history, because the code remains the final authority.

## Maintenance rule

Update and commit this file as part of every major functional release. At a
minimum, revise the implementation status, data model, workflows, integrations,
deployment state, known gaps, tests, and recommended next milestones whenever
one of those areas changes. A major feature is not considered fully handed off
until this document accurately describes it.

## 1. What The Forge is

The Forge is a Christian boys ministry nonprofit in Virginia Beach. It helps
boys become faithful men through:

- faith;
- fitness;
- fellowship;
- competition and fun;
- discipline, character, resilience, and brotherhood.

The organization is largely led by Navy SEALs and similarly experienced men,
but the website must not feel like a military recruiting site. The intended
brand is rugged, strong, disciplined, masculine, and energetic while remaining
welcoming to parents and clearly centered on following Jesus Christ.

Core visual direction:

- Forge red, black, charcoal, warm white, and steel gray;
- bold condensed display typography;
- real Forge photography;
- subtle grit and hard-edged shapes;
- clean hierarchy and polished motion;
- no excessive camouflage, tactical motifs, weapons, ranks, or SEAL branding.

The current logo and original ministry photography/copy should be preserved
unless the owner explicitly requests a change.

## 2. Product decisions that should not be casually changed

### Events

- Events are free.
- Parents may register without creating or entering an account.
- Parent email is the household identity key.
- Parent mobile number is required.
- Operational email is automatically enabled for an event registration.
- SMS is optional and requires explicit consent.
- The 9–16 age range is informational, not enforced.
- Capacity counts children, not parents or households.
- A registration may contain multiple children.
- Parents may edit children, add children if capacity permits, partially cancel,
  or cancel all children.
- A cancelled child's seat is returned immediately.
- Registration closes at the configured close time, normally the event start.
- All event times use `America/New_York`.

Child data:

- first name;
- last name;
- birth date;
- stated age;
- allergies;
- per-child notes.

Household data:

- parent/guardian first and last name;
- email;
- required mobile phone;
- emergency contact name and phone;
- general email-list consent;
- SMS consent metadata.

### Waitlist

- Waitlist order is first come, first served.
- Families are promoted only when their entire requested seat count fits.
- Do not offer partial seats.
- Offered seats are held for 24 hours.
- If an offer expires, seats are released and the next complete request that
  fits is considered.
- Cancellation or seat changes should trigger another waitlist evaluation.

### Accounts and authentication

- Parents should not need to sign in before registering.
- Guest registrations are associated to a normalized email/household.
- When the parent later verifies that email, the household is connected to the
  authenticated account.
- Authentication uses a six-digit email code, never a password.
- Existing child data must never be revealed merely because someone typed the
  same email into a public form. Saved household data is shown only after the
  email is verified through authentication.

### Communications

- Twilio SendGrid is used for email.
- Twilio Messaging is used for SMS.
- Mailchimp is not part of the new application.
- Event-specific communication data remains in Convex.
- Administrators can send email, SMS, or both.
- Admin audiences are confirmed families, waitlisted families, or all families
  attached to an event.
- Automatic reminders are intended for one week before and the morning of the
  event.
- General newsletter consent is separate from required operational event email.
- SMS consent must remain optional, versioned, and timestamped.
- STOP/suppression handling must always be respected.

### Donations

- Stripe is authoritative for payments, receipts, subscriptions, and payment
  methods.
- Gifts may be one-time, monthly, quarterly, or annual.
- Presets are $10, $25, $50, $100, $250, and $500, plus a custom amount.
- Stripe Checkout accepts cards and US bank accounts.
- Giving history is mirrored into Convex by signed Stripe webhooks.
- The account page links to Stripe Customer Portal.
- No GiveWP/WordPress donation-history migration is required.

### Administration

One Forge Admin experience should eventually manage everything. Avoid requiring
staff to learn Sanity or a separate CMS unless a later requirement truly needs
one.

Roles:

- `owner`: full access;
- `event_manager`: event operations and communications;
- `checkin`: roster/check-in access only.

Configured owner email allowlist:

- `bryantdigitalusa@gmail.com`
- `dave.greninger77@gmail.com`

The actual allowlist is controlled by the Convex environment variable
`FORGE_OWNER_EMAILS`.

## 3. Current technology and runtime

Core stack:

- Next.js 16 App Router;
- React 19;
- TypeScript;
- Convex database, functions, file storage, scheduling, and HTTP endpoints;
- Better Auth through `@convex-dev/better-auth`;
- Better Auth Email OTP plugin;
- Twilio SendGrid REST API;
- Twilio Messaging REST API;
- Stripe Checkout, Billing, Customer Portal, and webhooks;
- pnpm 11;
- Node.js 22.13 or newer.

There are two build paths in this repository:

1. Vercel uses standard Next.js through `pnpm exec next build`, configured in
   `vercel.json`.
2. The Codex/Sites preview and local package scripts use Vinext/Vite and a
   Cloudflare-compatible worker build.

Important files for the second build path:

- `vite.config.ts`
- `worker/index.ts`
- `build/sites-vite-plugin.ts`
- `.openai/hosting.json`

Do not remove the Vinext/Sites configuration simply because Vercel uses the
standard Next.js build. Both paths have been used during development.

## 4. Repository map

### Public and account UI

- `app/page.tsx` — homepage.
- `app/components.tsx` — shared header, navigation, footer, and visual helpers.
- `app/globals.css` — almost the entire design system and responsive styling.
- `app/home-motion.tsx` — homepage motion and reveal behavior.
- `app/events/page.tsx` — public event index.
- `app/events/[slug]/page.tsx` — event detail template.
- `app/events/[slug]/register/page.tsx` — registration page.
- `app/events/[slug]/register/registration-form.tsx` — guest RSVP client UI.
- `app/rsvp/[token]/...` — secure guest registration-management experience.
- `app/waitlist/claim/[token]/...` — guest waitlist-offer claim experience.
- `app/account/page.tsx` — sign-in/account shell.
- `app/account/auth-card.tsx` — passwordless sign-in and account composition.
- `app/account/account-dashboard.tsx` — household event list.
- `app/account/registrations/[registrationId]/...` — authenticated reservation
  management.
- `app/account/giving-history.tsx` — giving and recurring gift display.
- `app/donate/page.tsx` and `app/donation-form.tsx` — donation experience.
- `app/volunteer/page.tsx` — volunteer application presentation.
- `app/waiver/page.tsx` — participation waiver.

### Forge Admin

- `app/admin/layout.tsx` — server-side admin gate.
- `app/admin/page.tsx` — dashboard.
- `app/admin/components.tsx` — admin navigation/header.
- `app/admin/events/new/page.tsx` — create event.
- `app/admin/events/[slug]/edit/page.tsx` — edit event.
- `app/admin/events/event-form.tsx` — event editor.
- `app/admin/events/[slug]/page.tsx` — event metrics, communications, parent
  roster, and child check-in roster.
- `app/admin/events/[slug]/communication-composer.tsx` — admin broadcast UI and
  delivery history.
- `app/admin/events/[slug]/roster-actions.tsx` — print and CSV export controls
  for the authorized child roster.
- `app/admin/events/[slug]/roster-table.tsx` — durable per-child check-in.

### Next.js API routes

- `app/api/auth/[...all]/route.ts` — Better Auth HTTP handler.
- `app/api/registrations/route.ts` — validates guest RSVP, creates a secure
  management token, calls Convex, and triggers the confirmation email.
- `app/api/registrations/children/route.ts` — guest child add/edit operations.
- `app/api/registrations/cancel/route.ts` — guest partial cancellation.
- `app/api/registrations/claim/route.ts` — guest waitlist claim.
- `app/api/event-notifications/route.ts` — registration-open/waitlist alert
  subscription.

### Shared application logic

- `lib/events.ts` — converts Convex event documents into public event view
  models and calculates public enrollment states.
- `lib/rsvp.ts` — authoritative Next-side RSVP validation and consent versions.
- `lib/event-notifications.ts` — event alert validation.
- `lib/roster-export.ts` — spreadsheet-safe child-roster CSV generation and
  stable download filenames.
- `lib/secure-tokens.ts` — cryptographically secure URL tokens and SHA-256
  hashing.
- `lib/auth-client.ts` — Better Auth browser client.
- `lib/auth-server.ts` — authenticated Next.js/Convex server helpers.
- `app/data.ts` — brand content plus a static fallback event.

### Convex backend

- `convex/schema.ts` — all application tables, fields, and indexes.
- `convex/events.ts` — public/admin event queries, event CRUD, capacity
  presentation, rosters, and check-in.
- `convex/registrations.ts` — household/child registration domain, account
  association, cancellations, waitlist, offers, and registration emails.
- `convex/communications.ts` — audiences, queueing, SendGrid/Twilio delivery,
  reminder scheduling, delivery history, and SMS suppression.
- `convex/eventNotifications.ts` — public event-alert subscriptions.
- `convex/donations.ts` — Stripe Checkout/Portal actions and webhook
  persistence.
- `convex/adminAuth.ts` — owner bootstrap and role authorization.
- `convex/auth.ts` — Better Auth configuration and branded SendGrid OTP email.
- `convex/http.ts` — Better Auth routes plus signed Stripe and Twilio webhooks.
- `convex/crons.ts` — hourly reminder processing.
- `convex/convex.config.ts` — Better Auth Convex component.
- `convex/_generated/*` — generated Convex API and data model; regenerate
  instead of editing manually.

### Existing documentation and tests

- `docs/PRODUCT_SPEC.md` — original agreed product scope.
- `docs/INTEGRATION_SETUP.md` — integration notes, some of which are now stale.
- `README.md` — high-level repository entry point, also partially stale.
- `tests/rsvp.test.mjs`
- `tests/event-notifications.test.mjs`
- `tests/rendered-html.test.mjs`

## 5. Routing and rendering model

Public event pages are primarily server-rendered. `lib/events.ts` calls Convex
with `fetchQuery`, maps database records to the `ForgeEvent` UI type, and
calculates status:

- `cancelled` when the event is cancelled;
- `closed` when completed or after registration close;
- `full` when no seats remain;
- `scheduled` before enrollment opens;
- `open` otherwise.

There is a static September event in `app/data.ts`. If Convex fails or returns no
published events, public queries may fall back to this event. This was useful
during initial setup, but it can mask backend/configuration failures. Revisit or
remove this fallback before a formal production launch.

Client components use `convex/react` for live queries, actions, and mutations.
Server components use helpers from `lib/auth-server.ts` or `convex/nextjs`.

## 6. Data model and relationships

The complete schema is in `convex/schema.ts`. The relationship model is:

```text
Better Auth user
  ├── may connect to one household by verified normalized email
  └── may have one adminMembership

household
  ├── many saved children
  ├── many event registrations
  ├── many communication deliveries
  └── optional Stripe customer/donation/subscription associations

event
  ├── many registrations
  ├── many registrationChildren
  ├── many eventNotifications
  ├── many communications/deliveries
  └── many audit logs by entity reference

registration
  ├── belongs to one event
  ├── belongs to one household
  └── contains many registrationChildren snapshots

Stripe customer
  ├── many donation records
  └── many Stripe subscription mirrors
```

### `households`

One private family/contact record keyed by normalized email.

Important fields:

- parent identity and contact information;
- household emergency contact;
- optional `authUserId`;
- general email and SMS consent timestamps/version;
- created/updated timestamps.

`normalizedEmail` is the guest-to-account association key. Do not expose data
based only on an unverified email entry.

### `children`

Reusable household child profiles. Allergies and notes are per child. A child
can be archived instead of destroyed.

### `events`

Stores:

- unique slug;
- title, excerpt, description;
- optional Convex storage image;
- complete venue address;
- fixed Eastern timezone literal;
- start/end/enrollment-open/registration-close timestamps;
- capacity and low-capacity threshold;
- status: `draft`, `published`, `cancelled`, or `completed`;
- creator and audit timestamps.

Public capacity is derived from active registration children plus temporarily
offered waitlist seats. Do not add a manually maintained “remaining” field.

### `registrations`

One event reservation per household while active.

State machine:

```text
confirmed ──cancel all──> cancelled
waitlisted ──offer fits──> offered ──claim──> confirmed
                                  └─expire──> waitlisted
waitlisted/offered ──cancel all──> cancelled
```

Important fields:

- `seatCount`;
- monotonically assigned `waitlistPosition`;
- offer timestamps and hashed offer token;
- hashed management token;
- waiver version and acceptance time;
- per-registration email/SMS notification preferences;
- reminder/confirmation timestamps;
- cancellation timestamps.

### `registrationChildren`

This is the event-time snapshot of each participating child. It intentionally
duplicates name, birth date, age, allergies, and notes from the reusable child
profile so historical rosters remain stable.

It also contains:

- `active` or `cancelled` status;
- durable `checkedInAt`;
- the admin user that checked the child in;
- cancellation and audit timestamps.

Event seat use is based on active `registrationChildren`.

### `eventNotifications`

Stores pre-enrollment or waitlist alerts. A subscription may use email, SMS, or
both. It includes full SMS consent evidence. It is distinct from a confirmed
event registration and from the general newsletter.

### `adminMemberships`

Maps a Better Auth user ID to `owner`, `event_manager`, or `checkin`. Memberships
can be disabled. Owner allowlisting alone does not create a membership; the
allowed user activates owner access from the account page.

### `volunteerSubmissions`

Schema exists for contact details, role interests, background-check acceptance,
Statement of Faith acceptance, faith response, status, and notification time.

The public form now writes validated applications to this table. Forge Admin
supports the active workflow `new` → `denied` or `pending` → `approved`.

Related tables:

- `signatureRequests` snapshots the agreement, stores only a hashed signing
  token, and tracks sent/viewed/signed state;
- `signatureEvents` is the signing audit trail;
- finalized PDFs are stored in Convex file storage with a SHA-256 digest.

### Stripe tables

- `stripeCustomers` — Stripe customer mirror and email/household association.
- `donations` — successful one-time gifts and recurring invoice payments.
- `stripeSubscriptions` — subscription status and period information.
- `stripeWebhookEvents` — processed Stripe event IDs for idempotency.

All three domain tables include optional `livemode`. Existing records without a
value are treated as test-mode records. `STRIPE_LIVE_MODE=false` causes account
queries and Checkout to use only test customers/history. When deliberately
moving to real Stripe keys, set `STRIPE_LIVE_MODE=true` so sandbox customers and
gifts cannot be reused or mixed with live giving.

### Communication tables

- `communications` — one queued logical email or SMS job.
- `communicationDeliveries` — per-recipient delivery result.
- `smsSuppressions` — STOP, carrier, or admin suppressions.

Jobs track channel, provider, kind, audience, content, status, schedule,
test-mode metadata, and the initiating admin.

### `auditLogs`

Append-only operational history for privileged or important domain actions.
Each record contains actor information when available, action, entity type,
entity ID, summary, and timestamp.

## 7. Guest RSVP workflow

1. The browser submits the guest form to `POST /api/registrations`.
2. `lib/rsvp.ts` validates and normalizes input.
3. The API route creates a random 32-byte management token.
4. Only the SHA-256 hash is stored in Convex.
5. `registrations:register` runs as one Convex mutation:
   - validates event state and time;
   - creates or updates the normalized-email household;
   - rejects a second active registration for the same event/household;
   - calculates capacity;
   - confirms the entire request or places it on the waitlist;
   - upserts reusable child profiles;
   - creates registration-child snapshots;
   - writes an audit log.
6. The API calls the confirmation action with the raw token.
7. The email and success response provide `/rsvp/<raw-token>`.
8. Guest management routes hash the token before querying/mutating Convex.

Do not store raw management or waitlist tokens. Do not move capacity decisions
into browser code or a non-transactional external process.

## 8. Capacity, cancellation, and waitlist behavior

Capacity is calculated within Convex from active child snapshots. The
registration mutation prevents overselling because reads and writes occur in a
single serializable Convex transaction.

When children are added:

- the registration must still be open;
- the full added count must fit;
- new or matching reusable child profiles are connected;
- `seatCount` and snapshots are updated.

When children are cancelled:

- selected active snapshots become cancelled;
- `seatCount` is recalculated;
- the whole registration becomes cancelled if zero active children remain;
- cancellation email is attempted;
- waitlist processing is scheduled immediately.

Waitlist processing scans in first-come order and selects the first full family
request that fits. The registration becomes `offered`, seats are treated as
reserved, an offer token is stored as a hash, and an expiration job is
scheduled. Claiming changes it to `confirmed`. Expiration returns it to
`waitlisted` and advances processing.

## 9. Authentication and authorization

Authentication is Better Auth backed by the Convex Better Auth component.

Flow:

1. User enters an email on `/account`.
2. Better Auth generates a six-digit OTP.
3. `convex/auth.ts` sends a branded SendGrid email.
4. The code expires in ten minutes, allows five attempts, and is stored hashed.
5. Successful verification creates/signs in the user.
6. `connectMyHousehold` finds a household by normalized verified email and
   stores the Better Auth user ID.

Admin pages are gated twice:

- `app/admin/layout.tsx` redirects unauthenticated/non-admin users;
- Convex functions call `requireAdminAccess` or another role-aware server check.

Never rely only on hiding buttons in React. Every privileged query/mutation must
perform server-side role authorization.

The check-in role may read the roster and update attendance but should not gain
event editing or messaging access.

## 10. Event administration

Working now:

- list events;
- create and edit event details;
- draft/published/cancelled/completed states;
- Convex-hosted event image references;
- public capacity calculation;
- parent/guardian roster;
- alphabetical child check-in roster;
- durable per-child check-in;
- communication composer and delivery history.

Event timestamps are numeric milliseconds. UI formatting and product rules use
`America/New_York`. Preserve this behavior and test daylight-saving boundaries
when adding scheduling features.

## 11. Communications engine

`convex/communications.ts` owns operational messaging.

Admin broadcasts:

- require owner or event-manager access;
- support email, SMS, or both;
- support confirmed, waitlisted, or all-event-family audiences;
- offer test mode;
- count opted-in recipients before send;
- create a communication job per channel;
- schedule delivery immediately through Convex;
- create per-recipient delivery records;
- display history in Forge Admin.

Audience rules:

- email recipients must have event operational email enabled;
- SMS recipients must have event SMS enabled;
- SMS also requires household consent and no suppression;
- cancelled registrations should not receive active-event logistics.

Automatic reminders:

- `convex/crons.ts` runs reminder processing hourly;
- it identifies one-week and event-day reminders;
- event-day messaging is intended for approximately 8:00 AM Eastern;
- duplicate kinds for the event are not queued twice.

Email:

- delivered through SendGrid REST API;
- sign-in and operational templates are branded;
- SendGrid domain `forgeva.com` has been verified;
- provider response IDs are stored when available.

SMS:

- development currently supports a direct Twilio sender number through
  `TWILIO_FROM_PHONE_NUMBER`;
- production can instead use `TWILIO_MESSAGING_SERVICE_SID`;
- `SMS_ENABLED` feature-flags SMS;
- direct test delivery has succeeded.

Webhook endpoints:

- `<NEXT_PUBLIC_CONVEX_SITE_URL>/twilio/inbound`
- `<NEXT_PUBLIC_CONVEX_SITE_URL>/twilio/status`

Both validate Twilio signatures. The inbound endpoint processes STOP/START-type
commands and updates consent/suppressions. The status endpoint updates delivery
records and can suppress permanent failures.

Known operational caveat: the borrowed development Twilio account may not have
its inbound and status webhook URLs configured. Direct outbound SMS works, but
automatic STOP synchronization and delivery callbacks require the provider-side
webhook configuration. Do not claim those are fully operational without
testing them.

## 12. Stripe donation engine

The donation form calls `donations:createCheckoutSession`.

Checkout:

- validates names, email, amount, and frequency;
- accepts $1 through $100,000;
- uses payment mode for one-time gifts;
- uses subscription mode for recurring gifts;
- maps quarterly giving to a three-month interval;
- uses card and `us_bank_account`;
- reuses a Stripe customer only when email and `livemode` match.

Stripe webhook:

- endpoint is `<NEXT_PUBLIC_CONVEX_SITE_URL>/stripe/webhook`;
- validates the raw-body Stripe HMAC signature;
- rejects timestamps older than five minutes;
- stores processed event IDs for idempotency;
- handles:
  - `checkout.session.completed`;
  - `checkout.session.async_payment_succeeded`;
  - `invoice.paid`;
  - `customer.subscription.created`;
  - `customer.subscription.updated`;
  - `customer.subscription.deleted`.

Account giving:

- authenticated email selects the matching Stripe customer and gift records;
- paid gifts are shown newest first;
- recurring status and scheduled cancellation are displayed;
- receipts link to Stripe-hosted invoice pages when available;
- Customer Portal manages payment methods and recurring gifts.

Current Stripe state:

- the production application is intentionally using Stripe test credentials;
- `STRIPE_LIVE_MODE=false`;
- one-time and recurring sandbox gifts were successfully verified;
- Customer Portal and scheduled cancellation were tested;
- no real money has been processed.

To go live safely:

1. Create a live-mode Stripe webhook pointing to the same Convex endpoint.
2. Subscribe it to the six events listed above.
3. Replace the Convex `STRIPE_SECRET_KEY` with the live secret.
4. Replace `STRIPE_WEBHOOK_SECRET` with the live endpoint secret.
5. Set `STRIPE_LIVE_MODE=true`.
6. Make a small real gift and verify Checkout, webhook receipt, Convex history,
   Stripe receipt, and Customer Portal.
7. Never expose either secret in source, terminal output, chat, or screenshots.

## 13. Environment variables

Use `.env.example` as the canonical name list. Never commit real values.

### Convex/Next connection

- `CONVEX_DEPLOYMENT`
- `CONVEX_URL`
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CONVEX_SITE_URL`
- `NEXT_PUBLIC_SITE_URL`

### Authentication/admin

- `BETTER_AUTH_SECRET`
- `FORGE_OWNER_EMAILS`
- `SITE_URL` — used inside Convex for trusted origins and links.

### Registration

- `RSVP_TOKEN_SECRET` — retained in the configuration contract even though the
  current management tokens use secure random values plus SHA-256 hashing.

### SendGrid

- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `SENDGRID_FROM_NAME`
- `SENDGRID_REPLY_TO_EMAIL`

### Twilio

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_PHONE_NUMBER`
- `TWILIO_MESSAGING_SERVICE_SID`
- `TWILIO_STATUS_CALLBACK_SECRET`
- `SMS_ENABLED`

The application selects the Messaging Service when configured and otherwise
can use the direct sender number.

### Stripe

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — currently not required by the
  Stripe-hosted Checkout implementation but retained for possible Elements use.
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_LIVE_MODE`

### Volunteer

- `VOLUNTEER_NOTIFICATION_EMAIL`

Do not inspect or print production environment values during routine work.
Check only whether required names exist unless a secret rotation is explicitly
authorized.

## 14. Deployment

GitHub:

- repository: `BryantDigital/the-forge`;
- main branch: `main`;
- pushing `main` triggers the Vercel project deployment.

Vercel:

- current URL: `https://the-forge-sooty-nine.vercel.app`;
- project was created as “the forge,” although Vercel generated the current
  preview hostname;
- build command: `pnpm exec next build`.

Convex:

- production deployment: `mild-swordfish-582`;
- cloud URL: `https://mild-swordfish-582.convex.cloud`;
- HTTP/site URL: `https://mild-swordfish-582.convex.site`.

Codex Sites:

- `.openai/hosting.json` belongs to project
  `appgprj_6a67d0799f0881918796301779e65112`;
- the ChatGPT Sites preview has also been used during design iteration.

For a backend change:

1. run Convex code generation;
2. type-check and test;
3. deploy Convex production;
4. commit and push the matching frontend/generated code.

Avoid deploying a frontend that expects schema/functions that have not yet
reached production.

## 15. Local setup and standard verification

Requirements:

- Node.js 22.13+;
- pnpm 11;
- access to an appropriate Convex deployment.

Typical local setup:

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

After changing Convex schema or functions:

```bash
pnpm exec convex codegen
```

Before handoff or deployment:

```bash
pnpm exec tsc --noEmit
pnpm test
pnpm lint
pnpm exec next build
```

`pnpm test` runs a Vinext build before the Node tests. Running the explicit
Next build as well catches Vercel-specific issues.

At the time of this handoff:

- TypeScript passes;
- 15 tests pass;
- both Vinext and Next production builds pass;
- ESLint has warnings but no errors.

Most warnings are existing `@next/next/no-img-element` warnings and generated
Convex-file lint warnings. Do not let unrelated warning cleanup obscure a
feature change, but improve image optimization deliberately when appropriate.

## 16. Styling and UI evolution

The visual system is primarily centralized in `app/globals.css`; this is not a
component-library project. Before adding a new isolated styling approach:

1. search for an existing class or visual pattern;
2. reuse the shell, panel, button, field, metric, table, card, eyebrow, and
   responsive conventions;
3. preserve red as the high-priority/action color;
4. use dark secondary buttons on light backgrounds;
5. verify mobile, tablet, and desktop;
6. preserve accessibility states and reduced-motion expectations.

Reusable UI elements are in `app/components.tsx` and admin-specific elements in
`app/admin/components.tsx`.

Motion should support hierarchy:

- restrained entrance/reveal animation;
- subtle hover/press feedback;
- no animation that delays registration, giving, or check-in;
- avoid generic “tech startup” softness that fights the rugged brand.

## 17. Security and privacy invariants

This app stores information about minors. Treat that as sensitive.

Do not:

- expose children by email lookup without authenticated email verification;
- create a public child directory;
- put allergies, emergency contacts, or private notes into analytics;
- log provider secrets, OTPs, raw management tokens, or payment data;
- store raw Stripe card/bank data;
- trust client-calculated capacity;
- rely only on client-side admin gating;
- send SMS without explicit consent;
- ignore suppressions or STOP;
- destructively delete attendance or historical registration snapshots without
  a documented retention decision.

Always:

- hash URL management and offer tokens;
- verify Stripe and Twilio signatures;
- keep seat mutations transactional;
- version waiver and SMS consent;
- write server-side role checks;
- keep audit logs for privileged actions;
- use Stripe-hosted payment/portal surfaces;
- minimize personal data returned by queries.

Before a full public launch, define and implement:

- data retention periods;
- parent data-deletion/export procedures;
- incident response;
- privacy policy;
- authorization tests;
- rate limiting/abuse controls for OTP and public forms.

## 18. What is working now

Verified or implemented:

- branded responsive public site;
- public events backed by Convex;
- admin event create/edit;
- guest multi-child RSVP;
- email-based household association;
- transactional capacity;
- full-family waitlist and 24-hour offers;
- guest secure management links;
- authenticated parent reservation management;
- partial cancellation and adding/editing children;
- parent roster;
- child-only check-in roster;
- print-optimized child roster with allergies/notes and attendance;
- authorized, spreadsheet-safe child roster CSV export;
- durable attendance;
- passwordless six-digit email login;
- owner bootstrap and role-aware admin gates;
- SendGrid sign-in and operational email;
- admin event email/SMS/both composer;
- confirmed/waitlisted/all audience segmentation;
- test communications and delivery history;
- hourly automatic reminder processing;
- direct-number Twilio outbound SMS;
- SMS consent and suppression data model;
- Stripe sandbox one-time and recurring giving;
- signed/idempotent Stripe webhook;
- account giving history, receipts, recurring status, and Customer Portal;
- separation of Stripe test and future live data.
- working volunteer application with server-side validation and basic bot traps;
- branded new-application notification to Dave;
- live volunteer counts and recent applications in Forge Admin;
- volunteer review, denial, acceptance, and pending-signature workflow;
- secure 14-day, single-use agreement links;
- backend-generated signed PDFs, document hashes, and audit events;
- automatic volunteer approval and confirmation email after signature.

## 19. Known incomplete, placeholder, or launch-blocking work

This section is especially important. Do not infer completion from polished UI.

### Volunteer system

- The first agreement template is embedded in
  `convex/volunteerAgreement.ts`; Forge counsel should review its wording before
  formal use.
- There is not yet a template editor or multiple-document packet builder.
- Signature links can be resent from Admin, which revokes the previous link.
- The basic system uses typed-name signatures, email-link attribution,
  timestamps, immutable template snapshots, finalized PDFs, and SHA-256
  digests. It does not provide notarization or identity verification.

### Newsletter

- The homepage newsletter form is presentation-only.
- It is not connected to SendGrid or a Convex subscriber table.
- General email consent on RSVP is stored on the household, but there is not yet
  a complete general-list management workflow.

### Admin dashboard/reporting

- Volunteer counts and recent applications are live.
- The dashboard eyebrow date is hardcoded.
- There is no donation reporting dashboard.
- There is no role-management UI.
- There is no full audit-log UI.

### Communications operations

- Outbound direct SMS has been tested.
- Provider-side inbound/status webhook setup may still be missing on the
  borrowed Twilio development account.
- End-to-end STOP and delivery-status callbacks need provider-level verification.
- Formal messaging compliance for the dedicated Forge Twilio account is still
  pending.

### Stripe launch

- Stripe remains in sandbox mode.
- Real giving requires the explicit live-mode procedure in section 12.
- Admin donation reporting and reconciliation UI are not built.

### Content/commerce/launch

- Shopify is expected to be external and is not integrated yet.
- Final custom-domain cutover from WordPress is not complete.
- WordPress redirects and SEO migration need planning.
- Analytics are not configured.
- Formal accessibility, security, privacy, and production-readiness reviews
  remain.
- Static fallback event behavior should be removed or made explicit.

### Test coverage

Current tests cover validation and rendered page smoke tests, not the full
backend state machines. Add Convex integration tests for:

- concurrent capacity requests;
- full-family waitlist ordering;
- offer expiration and reclaim;
- partial cancellation;
- admin authorization by role;
- OTP abuse/rate limits;
- communication audience consent and suppression;
- webhook idempotency and signature failures;
- test/live Stripe isolation.

## 20. Recommended next milestones

A sensible order from the current state:

1. **Real admin dashboard**
   - replace hardcoded metrics/activity;
   - add volunteer counts;
   - donation reporting;
   - attendance trends;
   - communication health.

2. **Communications hardening**
   - dedicated Forge Twilio account;
   - compliance approval;
   - inbound and status callbacks;
   - STOP/START end-to-end tests;
   - retry strategy and provider failure reporting.

3. **General email list**
   - connect homepage signup;
   - decide whether SendGrid Marketing Campaigns or a Convex-owned list is the
     subscription authority;
   - implement unsubscribe and consent history.

4. **Production Stripe activation**
   - only after legal copy, receipts, finance workflow, and live webhook
     verification are approved.

5. **Launch readiness**
   - accessibility and mobile QA;
   - privacy/retention/security work;
   - error monitoring and analytics;
   - custom domain, redirects, canonical URLs, sitemap, and WordPress cutover.

## 21. How a future agent should begin a session

Use this checklist:

1. Read this file and `docs/PRODUCT_SPEC.md`.
2. Inspect `git status` and preserve user changes.
3. Read the files directly related to the requested feature.
4. Inspect `convex/schema.ts` before modifying data behavior.
5. Search for existing UI classes before adding new ones.
6. Confirm whether the requested surface is functional or a prototype.
7. State any material assumption.
8. Implement the smallest complete vertical slice.
9. Add or update tests for behavior, especially capacity/auth/payment logic.
10. Run codegen, type-check, tests, lint, Vinext build, and Next build as
    appropriate.
11. Deploy Convex before the frontend when backend compatibility requires it.
12. Push deliberately and verify the public result.
13. Update this handoff when architecture, data, integrations, or deployment
    state materially changes.

## 22. Prompt to use with this file

Attach this file to a new code session and use:

> This is the engineering handoff for The Forge application. Read it completely,
> then inspect the current repository and Git status before making changes.
> Treat the source code as authoritative if the handoff and code differ.
> Preserve the product decisions, security invariants, visual direction, and
> data relationships described here. Tell me what is already implemented versus
> incomplete before you begin the requested next milestone.
