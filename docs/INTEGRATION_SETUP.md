# Forge integration setup

The event-alert data flow is implemented. Complete these provider steps before
turning on production delivery.

## 1. Convex

1. Create or select The Forge project in Convex.
2. Run `pnpm convex dev` from this repository and keep the generated
   `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, and
   `NEXT_PUBLIC_CONVEX_SITE_URL` values.
3. Set `SITE_URL` and a strong `BETTER_AUTH_SECRET` in the Convex deployment.
4. Deploy the schema and `eventNotifications:subscribe` mutation.
5. Add `CONVEX_URL`, `NEXT_PUBLIC_CONVEX_URL`, and
   `NEXT_PUBLIC_CONVEX_SITE_URL` to Vercel and Sites.
6. Set `FORGE_OWNER_EMAILS` in Convex to the comma-separated addresses that may
   activate the owner role.

Until those values are present, the public form returns a friendly setup
message and does not pretend the subscription was stored.

## 2. Passwordless authentication

The Better Auth component, Email OTP plugin, and Convex authentication provider
are registered. Parents and staff enter an email address and a six-digit code;
there are no passwords. The first successful code verification creates the
account automatically.

Email codes are sent by Twilio SendGrid. Configure these values in the Convex
deployment:

- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL` (must be a verified sender or authenticated domain)
- `SENDGRID_FROM_NAME` (defaults to `The Forge`)
- `SENDGRID_REPLY_TO_EMAIL` (optional)

Do not enable admin broadcasts before the owner and event-manager role checks
are active.

## 3. Twilio Messaging

1. Create or select a Twilio Messaging Service.
2. Complete the required US sender registration for the chosen number type.
3. Configure:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_MESSAGING_SERVICE_SID`
   - `TWILIO_STATUS_CALLBACK_SECRET`
4. Keep SMS disabled until a test message, STOP handling, and delivery callback
   have been verified.
5. Set `SMS_ENABLED=true` only after that verification.

Every subscription stores the consent version, full consent disclosure,
acceptance time, normalized phone number, and selected channels.

## 4. Twilio SendGrid

Use SendGrid for sign-in codes, individual confirmations, operational notices,
admin broadcasts, and the general Forge email list. Mailchimp is not part of the
new application.

Required values:

- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `SENDGRID_FROM_NAME`

Verify the Forge sending domain before enabling live email delivery.
