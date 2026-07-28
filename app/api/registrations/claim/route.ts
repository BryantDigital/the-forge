import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { hashSecureToken } from "../../../../lib/secure-tokens";

const claimOffer = makeFunctionReference<
  "mutation",
  { offerTokenHash: string },
  { registrationId: string; status: "confirmed" }
>("registrations:claimOffer");

export async function POST(request: Request) {
  let input: { offerToken?: string };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return Response.json({ error: "This offer link is invalid." }, { status: 400 });
  }
  if (!input.offerToken) {
    return Response.json({ error: "This offer link is invalid." }, { status: 400 });
  }

  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return Response.json({ error: "Waitlist offers are temporarily unavailable." }, { status: 503 });
  }
  try {
    const client = new ConvexHttpClient(convexUrl);
    const result = await client.mutation(claimOffer, {
      offerTokenHash: await hashSecureToken(input.offerToken),
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Unable to claim waitlist offer", error);
    return Response.json(
      { error: readableConvexError(error, "This offer is invalid or expired.") },
      { status: 409 },
    );
  }
}

function readableConvexError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/Uncaught ConvexError:\s*([^\n]+)/);
  return match?.[1] ?? fallback;
}
