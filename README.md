# The Forge

The Forge is a Christ-centered boys ministry helping boys ages 9–16 grow
through faith, fitness, fellowship, competition, and brotherhood.

This repository contains the new public website, guest event-registration
experience, My Forge parent portal, and unified Forge Admin.

## Product shape

- Next.js App Router application
- Convex application data and scheduled workflows
- Convex + Better Auth six-digit email-code authentication
- Stripe donations and recurring giving
- Twilio SendGrid email and Twilio Messaging SMS
- Guest-first RSVP, transactional capacity, waitlist offers, and child check-in

The complete agreed scope and delivery milestones are documented in
[`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md).

## Local development

Requirements:

- Node.js 22.13 or newer
- pnpm 11
- A Convex project for live backend development

Install and run:

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Build, type-check, lint, and test:

```bash
pnpm build
pnpm exec tsc --noEmit
pnpm lint
pnpm test
```

## Current milestone

The first milestone establishes:

- the Forge brand system and responsive public pages;
- realistic event, RSVP, donation, volunteer, parent, and admin surfaces;
- the initial Convex schema for households, children, events, registrations,
  waitlists, attendance, volunteers, donations, communications, roles, and
  audit logs.

The application is connected to its Convex deployment. Completing the Stripe,
Twilio SendGrid, and Twilio Messaging provider configuration is part of the
next implementation milestone.
