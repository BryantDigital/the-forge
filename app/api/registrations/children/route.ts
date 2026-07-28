import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { hashSecureToken } from "../../../../lib/secure-tokens";
import type { RsvpChildInput } from "../../../../lib/rsvp";

const addChildren = makeFunctionReference<
  "mutation",
  { managementTokenHash: string; children: RsvpChildInput[]; waiverAccepted: boolean },
  { addedChildren: number; seatCount: number; status: string }
>("registrations:addChildren");

const updateChild = makeFunctionReference<
  "mutation",
  {
    managementTokenHash: string;
    registrationChildId: string;
    child: RsvpChildInput;
  },
  { updated: boolean }
>("registrations:updateChild");

export async function POST(request: Request) {
  const input = await readInput(request);
  if (!input || !input.managementToken || !Array.isArray(input.children)) {
    return Response.json({ error: "Enter the participant information." }, { status: 400 });
  }
  const managementToken = input.managementToken;
  const children = input.children;
  return runMutation(async (client) =>
    client.mutation(addChildren, {
      managementTokenHash: await hashSecureToken(managementToken),
      children,
      waiverAccepted: input.waiverAccepted === true,
    }),
  );
}

export async function PATCH(request: Request) {
  const input = await readInput(request);
  if (!input?.managementToken || !input.registrationChildId || !input.child) {
    return Response.json({ error: "Enter the participant information." }, { status: 400 });
  }
  const managementToken = input.managementToken;
  const registrationChildId = input.registrationChildId;
  const child = input.child;
  return runMutation(async (client) =>
    client.mutation(updateChild, {
      managementTokenHash: await hashSecureToken(managementToken),
      registrationChildId,
      child,
    }),
  );
}

async function readInput(request: Request) {
  try {
    return (await request.json()) as {
      managementToken?: string;
      registrationChildId?: string;
      children?: RsvpChildInput[];
      child?: RsvpChildInput;
      waiverAccepted?: boolean;
    };
  } catch {
    return null;
  }
}

async function runMutation(action: (client: ConvexHttpClient) => Promise<unknown>) {
  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return Response.json({ error: "Registration management is temporarily unavailable." }, { status: 503 });
  }
  try {
    const result = await action(new ConvexHttpClient(convexUrl));
    return Response.json({ ok: true, result });
  } catch (error) {
    console.error("Unable to update registration children", error);
    return Response.json(
      { error: readableConvexError(error, "We could not update this participant.") },
      { status: 409 },
    );
  }
}

function readableConvexError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  return error.message.match(/Uncaught ConvexError:\s*([^\n]+)/)?.[1] ?? fallback;
}
