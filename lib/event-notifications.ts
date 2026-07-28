export const SMS_CONSENT_VERSION = "event-alerts-v1";
export const SMS_CONSENT_TEXT =
  "I agree to receive event-related text messages from The Forge. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe.";

export type EventNotificationRequest = {
  eventSlug: string;
  kind: "registration_open" | "waitlist";
  parentName: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  email?: string;
  mobilePhone?: string;
  smsConsent?: boolean;
};

export type ValidatedEventNotification = {
  eventSlug: string;
  kind: "registration_open" | "waitlist";
  parentName: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  email?: string;
  normalizedEmail?: string;
  mobilePhone?: string;
  smsConsentVersion?: string;
  smsConsentText?: string;
  smsConsentAcceptedAt?: number;
};

function normalizeUsPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const nationalNumber =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (nationalNumber.length !== 10) {
    return null;
  }

  return `+1${nationalNumber}`;
}

export function validateEventNotification(
  input: EventNotificationRequest,
  now = Date.now(),
):
  | { ok: true; value: ValidatedEventNotification }
  | { ok: false; error: string } {
  const parentName = input.parentName?.trim();
  const eventSlug = input.eventSlug?.trim().toLowerCase();

  if (!eventSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(eventSlug)) {
    return { ok: false, error: "Please select a valid event." };
  }

  if (input.kind !== "registration_open" && input.kind !== "waitlist") {
    return { ok: false, error: "Please select a valid alert type." };
  }

  if (!parentName || parentName.length > 120) {
    return { ok: false, error: "Please enter the parent or guardian name." };
  }

  if (!input.emailEnabled && !input.smsEnabled) {
    return { ok: false, error: "Choose email, text message, or both." };
  }

  let email: string | undefined;
  let normalizedEmail: string | undefined;
  if (input.emailEnabled) {
    email = input.email?.trim();
    normalizedEmail = email?.toLowerCase();
    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return { ok: false, error: "Please enter a valid email address." };
    }
  }

  let mobilePhone: string | undefined;
  if (input.smsEnabled) {
    mobilePhone = normalizeUsPhone(input.mobilePhone ?? "") ?? undefined;
    if (!mobilePhone) {
      return { ok: false, error: "Please enter a valid 10-digit mobile number." };
    }
    if (!input.smsConsent) {
      return {
        ok: false,
        error: "Please agree to receive event-related text messages.",
      };
    }
  }

  return {
    ok: true,
    value: {
      eventSlug,
      kind: input.kind,
      parentName,
      emailEnabled: input.emailEnabled,
      smsEnabled: input.smsEnabled,
      email,
      normalizedEmail,
      mobilePhone,
      smsConsentVersion: input.smsEnabled ? SMS_CONSENT_VERSION : undefined,
      smsConsentText: input.smsEnabled ? SMS_CONSENT_TEXT : undefined,
      smsConsentAcceptedAt: input.smsEnabled ? now : undefined,
    },
  };
}
