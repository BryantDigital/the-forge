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

## 2. Administrator authentication

The Better Auth component and Convex authentication provider are registered.
After Convex generates its typed API files, finish the Better Auth instance,
Next.js auth proxy, login page, and role guard for `/admin`.

Do not enable admin broadcasts before the owner and event-manager role checks
are active.

## 3. Twilio

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

## 4. Mailchimp

Configure the existing Mailchimp audience for the general newsletter. Use
Mailchimp Transactional for individual confirmations and operational notices,
or the Marketing API for true bulk campaigns.

Required values:

- `MAILCHIMP_API_KEY`
- `MAILCHIMP_SERVER_PREFIX`
- `MAILCHIMP_AUDIENCE_ID`
- `MAILCHIMP_TRANSACTIONAL_API_KEY`

Verify the Forge sending domain before enabling live email delivery.
