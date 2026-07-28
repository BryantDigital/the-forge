export const WAIVER_VERSION = "forge-participation-v1";
export const RSVP_SMS_CONSENT_VERSION = "event-updates-v1";
export const RSVP_SMS_CONSENT_TEXT =
  "I agree to receive event registration updates and reminders from The Forge. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe.";

export type RsvpChildInput = {
  firstName: string;
  lastName: string;
  birthDate: string;
  statedAge: number;
  allergies?: string;
  notes?: string;
};

export type RsvpRequest = {
  eventSlug: string;
  parentFirstName: string;
  parentLastName: string;
  email: string;
  mobilePhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  children: RsvpChildInput[];
  waiverAccepted: boolean;
  smsConsent: boolean;
  generalEmailOptIn: boolean;
};

export type ValidatedRsvp = {
  eventSlug: string;
  parentFirstName: string;
  parentLastName: string;
  email: string;
  normalizedEmail: string;
  mobilePhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  children: RsvpChildInput[];
  waiverVersion: string;
  waiverAcceptedAt: number;
  emailNotificationsEnabled: true;
  smsNotificationsEnabled: boolean;
  smsConsentVersion?: string;
  smsConsentAcceptedAt?: number;
  generalEmailOptInAt?: number;
};

export function validateRsvp(
  input: RsvpRequest,
  now = Date.now(),
): { ok: true; value: ValidatedRsvp } | { ok: false; error: string } {
  const eventSlug = clean(input.eventSlug).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(eventSlug)) {
    return { ok: false, error: "Please select a valid event." };
  }

  const parentFirstName = clean(input.parentFirstName);
  const parentLastName = clean(input.parentLastName);
  if (!parentFirstName || !parentLastName) {
    return { ok: false, error: "Enter the parent or guardian’s first and last name." };
  }

  const email = clean(input.email);
  const normalizedEmail = email.toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const mobilePhone = normalizeUsPhone(input.mobilePhone);
  const emergencyContactPhone = normalizeUsPhone(input.emergencyContactPhone);
  const emergencyContactName = clean(input.emergencyContactName);
  if (!mobilePhone) {
    return { ok: false, error: "Enter a valid 10-digit mobile number." };
  }
  if (!emergencyContactName || !emergencyContactPhone) {
    return { ok: false, error: "Enter a valid emergency contact name and phone number." };
  }

  if (!Array.isArray(input.children) || input.children.length < 1) {
    return { ok: false, error: "Add at least one child to the registration." };
  }
  if (input.children.length > 10) {
    return { ok: false, error: "A single registration can include up to 10 children." };
  }

  const children: RsvpChildInput[] = [];
  for (const child of input.children) {
    const firstName = clean(child.firstName);
    const lastName = clean(child.lastName);
    const birthDate = clean(child.birthDate);
    const statedAge = Number(child.statedAge);
    if (!firstName || !lastName) {
      return { ok: false, error: "Enter the first and last name for every child." };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(birthDate))) {
      return { ok: false, error: `Enter a valid birth date for ${firstName}.` };
    }
    if (!Number.isInteger(statedAge) || statedAge < 1 || statedAge > 21) {
      return { ok: false, error: `Enter a valid age for ${firstName}.` };
    }
    children.push({
      firstName,
      lastName,
      birthDate,
      statedAge,
      allergies: optionalClean(child.allergies),
      notes: optionalClean(child.notes),
    });
  }

  if (!input.waiverAccepted) {
    return { ok: false, error: "You must agree to the participation waiver." };
  }

  return {
    ok: true,
    value: {
      eventSlug,
      parentFirstName,
      parentLastName,
      email,
      normalizedEmail,
      mobilePhone,
      emergencyContactName,
      emergencyContactPhone,
      children,
      waiverVersion: WAIVER_VERSION,
      waiverAcceptedAt: now,
      emailNotificationsEnabled: true,
      smsNotificationsEnabled: Boolean(input.smsConsent),
      smsConsentVersion: input.smsConsent ? RSVP_SMS_CONSENT_VERSION : undefined,
      smsConsentAcceptedAt: input.smsConsent ? now : undefined,
      generalEmailOptInAt: input.generalEmailOptIn ? now : undefined,
    },
  };
}

export function normalizeUsPhone(value: string) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return national.length === 10 ? `+1${national}` : null;
}

function clean(value: unknown) {
  return String(value ?? "").trim().slice(0, 500);
}

function optionalClean(value: unknown) {
  const cleaned = clean(value);
  return cleaned || undefined;
}
