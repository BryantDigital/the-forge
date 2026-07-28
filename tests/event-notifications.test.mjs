import assert from "node:assert/strict";
import test from "node:test";
import { validateEventNotification } from "../lib/event-notifications.ts";

const base = {
  eventSlug: "the-forge-september-12",
  kind: "registration_open",
  parentName: "Taylor Smith",
};

test("accepts an email-only event alert", () => {
  const result = validateEventNotification({
    ...base,
    emailEnabled: true,
    smsEnabled: false,
    email: "Taylor@example.com",
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.normalizedEmail, "taylor@example.com");
  assert.equal(result.value.mobilePhone, undefined);
});

test("normalizes a consented US mobile number", () => {
  const result = validateEventNotification(
    {
      ...base,
      emailEnabled: false,
      smsEnabled: true,
      mobilePhone: "(757) 555-0123",
      smsConsent: true,
    },
    1234,
  );

  assert.equal(result.ok, true);
  assert.equal(result.value.mobilePhone, "+17575550123");
  assert.equal(result.value.smsConsentAcceptedAt, 1234);
});

test("rejects SMS alerts without explicit consent", () => {
  const result = validateEventNotification({
    ...base,
    emailEnabled: false,
    smsEnabled: true,
    mobilePhone: "757-555-0123",
    smsConsent: false,
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /agree/i);
});

test("requires at least one notification channel", () => {
  const result = validateEventNotification({
    ...base,
    emailEnabled: false,
    smsEnabled: false,
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /choose email/i);
});
