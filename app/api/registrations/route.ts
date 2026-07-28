import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { type RsvpRequest, type ValidatedRsvp, validateRsvp } from "../../../lib/rsvp";
import { createSecureToken, hashSecureToken } from "../../../lib/secure-tokens";

type RegistrationResult = {
  registrationId: string;
  status: "confirmed" | "waitlisted";
  seatCount: number;
  remaining: number;
};

const register = makeFunctionReference<
  "mutation",
  ValidatedRsvp & { managementTokenHash: string },
  RegistrationResult
>("registrations:register");

const sendConfirmation = makeFunctionReference<
  "action",
  { registrationId: string; managementToken: string },
  { sent: boolean }
>("registrations:sendConfirmation");

export async function POST(request: Request) {
  let input: RsvpRequest;
  try {
    input = (await request.json()) as RsvpRequest;
  } catch {
    return Response.json({ error: "Please check the registration form." }, { status: 400 });
  }

  const validation = validateRsvp(input);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return Response.json({ error: "Registration is temporarily unavailable." }, { status: 503 });
  }

  const managementToken = createSecureToken();
  const managementTokenHash = await hashSecureToken(managementToken);

  try {
    const client = new ConvexHttpClient(convexUrl);
    const result = await client.mutation(register, {
      ...validation.value,
      managementTokenHash,
    });

    try {
      await client.action(sendConfirmation, {
        registrationId: result.registrationId,
        managementToken,
      });
    } catch (emailError) {
      console.error("Registration saved but confirmation email failed", emailError);
    }

    return Response.json({
      ok: true,
      ...result,
      managementUrl: `/rsvp/${encodeURIComponent(managementToken)}`,
    });
  } catch (error) {
    console.error("Unable to create event registration", error);
    return Response.json(
      { error: readableConvexError(error, "We could not complete the registration.") },
      { status: 409 },
    );
  }
}

function readableConvexError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/Uncaught ConvexError:\s*([^\n]+)/);
  return match?.[1] ?? fallback;
}
