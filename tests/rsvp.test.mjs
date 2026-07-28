import assert from "node:assert/strict";
import test from "node:test";

import { validateRsvp } from "../lib/rsvp.ts";

function validRequest(overrides = {}) {
  return {
    eventSlug: "the-forge-august-15",
    parentFirstName: "Jordan",
    parentLastName: "Smith",
    email: " Jordan.Smith@Example.com ",
    mobilePhone: "(757) 555-0198",
    emergencyContactName: "Taylor Smith",
    emergencyContactPhone: "757-555-0133",
    smsConsent: true,
    generalEmailOptIn: true,
    waiverAccepted: true,
    children: [
      {
        firstName: "Caleb",
        lastName: "Smith",
        birthDate: "2014-05-04",
        statedAge: 12,
        allergies: "Peanuts",
        notes: "Carries an epinephrine auto-injector.",
      },
      {
        firstName: "Micah",
        lastName: "Smith",
        birthDate: "2016-08-19",
        statedAge: 9,
        allergies: "",
        notes: "",
      },
    ],
    ...overrides,
  };
}

test("validates and normalizes a multi-child guest RSVP", () => {
  const result = validateRsvp(validRequest());

  assert.equal(result.ok, true);
  assert.equal(result.value.normalizedEmail, "jordan.smith@example.com");
  assert.equal(result.value.mobilePhone, "+17575550198");
  assert.equal(result.value.emergencyContactPhone, "+17575550133");
  assert.equal(result.value.children.length, 2);
  assert.equal(result.value.children[0].firstName, "Caleb");
  assert.equal(result.value.smsNotificationsEnabled, true);
});

test("requires the event waiver", () => {
  const result = validateRsvp(validRequest({ waiverAccepted: false }));
  assert.deepEqual(result, {
    ok: false,
    error: "You must agree to the participation waiver.",
  });
});

test("requires at least one child", () => {
  const result = validateRsvp(validRequest({ children: [] }));
  assert.deepEqual(result, {
    ok: false,
    error: "Add at least one child to the registration.",
  });
});

test("rejects an invalid child birth date", () => {
  const request = validRequest();
  request.children[0].birthDate = "not-a-date";

  const result = validateRsvp(request);
  assert.deepEqual(result, {
    ok: false,
    error: "Enter a valid birth date for Caleb.",
  });
});

test("keeps SMS notifications off when the optional consent is not selected", () => {
  const result = validateRsvp(validRequest({ smsConsent: false }));
  assert.equal(result.ok, true);
  assert.equal(result.value.smsNotificationsEnabled, false);
  assert.equal(result.value.smsConsentAcceptedAt, undefined);
});
