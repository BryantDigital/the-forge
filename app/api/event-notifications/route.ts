import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import {
  type EventNotificationRequest,
  type ValidatedEventNotification,
  validateEventNotification,
} from "../../../lib/event-notifications";

const subscribe = makeFunctionReference<
  "mutation",
  ValidatedEventNotification,
  { id: string; created: boolean }
>("eventNotifications:subscribe");

export async function POST(request: Request) {
  let input: EventNotificationRequest;

  try {
    input = (await request.json()) as EventNotificationRequest;
  } catch {
    return Response.json({ error: "Please check the form and try again." }, { status: 400 });
  }

  const validation = validateEventNotification(input);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const convexUrl =
    process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    return Response.json(
      { error: "Event alerts are being connected. Please try again shortly." },
      { status: 503 },
    );
  }

  try {
    const client = new ConvexHttpClient(convexUrl);
    const result = await client.mutation(subscribe, validation.value);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Unable to save event notification subscription", error);
    return Response.json(
      { error: "We could not save your alert. Please try again." },
      { status: 502 },
    );
  }
}
