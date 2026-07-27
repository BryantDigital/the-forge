# The Forge

The Forge is a Christ-centered boys ministry helping boys ages 9–16 grow
through faith, fitness, fellowship, competition, and brotherhood.

This repository contains the new public website, guest event-registration
experience, My Forge parent portal, and unified Forge Admin.

## Product shape

- Next.js App Router application
- Convex application data and scheduled workflows
- Convex + Better Auth passwordless authentication
- Stripe donations and recurring giving
- Mailchimp marketing segmentation and transactional event messages
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

The forms currently demonstrate the intended product experience. Connecting
them to a live Convex deployment, Stripe account, and Mailchimp account is the
next implementation milestone.
