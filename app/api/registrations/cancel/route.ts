import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { hashSecureToken } from "../../../../lib/secure-tokens";

type CancellationResult = {
  registrationId: string;
  cancelledChildren: number;
  remainingChildren: number;
  status: string;
};

const cancelChildren = makeFunctionReference<
  "mutation",
  { managementTokenHash: string; childIds: string[] },
  CancellationResult
>("registrations:cancelChildren");

const sendCancellationNotifications = makeFunctionReference<
  "action",
  { registrationId: string; managementToken: string; cancelledChildren: number },
  { sent: boolean }
>("registrations:sendCancellationNotifications");

export async function POST(request: Request) {
  let input: { managementToken?: string; childIds?: string[] };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return Response.json({ error: "Please select the children to cancel." }, { status: 400 });
  }
  if (!input.managementToken || !Array.isArray(input.childIds) || input.childIds.length < 1) {
    return Response.json({ error: "Please select the children to cancel." }, { status: 400 });
  }

  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return Response.json({ error: "Registration management is temporarily unavailable." }, { status: 503 });
  }

  try {
    const client = new ConvexHttpClient(convexUrl);
    const result = await client.mutation(cancelChildren, {
      managementTokenHash: await hashSecureToken(input.managementToken),
      childIds: input.childIds,
    });
    try {
      await client.action(sendCancellationNotifications, {
        registrationId: result.registrationId,
        managementToken: input.managementToken,
        cancelledChildren: result.cancelledChildren,
      });
    } catch (emailError) {
      console.error("Cancellation saved but notification email failed", emailError);
    }
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Unable to cancel registration children", error);
    return Response.json(
      { error: readableConvexError(error, "We could not update the registration.") },
      { status: 409 },
    );
  }
}

function readableConvexError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/Uncaught ConvexError:\s*([^\n]+)/);
  return match?.[1] ?? fallback;
}
