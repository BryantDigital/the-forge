import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({
  path: "/twilio/inbound",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const form = await request.formData();
    if (!(await validTwilioRequest(request, form))) {
      return new Response("Invalid signature", { status: 403 });
    }
    await ctx.runMutation(internal.communications.recordInboundSms, {
      mobilePhone: String(form.get("From") ?? ""),
      body: String(form.get("Body") ?? ""),
      optOutType: optionalString(form.get("OptOutType")),
    });
    return twimlResponse();
  }),
});

http.route({
  path: "/twilio/status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const form = await request.formData();
    if (!(await validTwilioRequest(request, form))) {
      return new Response("Invalid signature", { status: 403 });
    }
    const errorCode = optionalString(form.get("ErrorCode"));
    const errorMessage = optionalString(form.get("ErrorMessage"));
    await ctx.runMutation(internal.communications.updateTwilioDeliveryStatus, {
      messageId: String(form.get("MessageSid") ?? ""),
      status: String(form.get("MessageStatus") ?? ""),
      recipient: optionalString(form.get("To")),
      error: [errorCode, errorMessage].filter(Boolean).join(": ") || undefined,
    });
    return new Response("OK", { status: 200 });
  }),
});

async function validTwilioRequest(request: Request, form: FormData) {
  const signature = request.headers.get("x-twilio-signature");
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!signature || !authToken) return false;
  const entries: Array<[string, string]> = [];
  form.forEach((value, key) => {
    entries.push([key, String(value)]);
  });
  entries.sort(([a], [b]) => a.localeCompare(b));
  const payload = request.url + entries.map(([key, value]) => `${key}${value}`).join("");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  const expected = btoa(
    Array.from(new Uint8Array(digest), (byte) => String.fromCharCode(byte)).join(""),
  );
  return constantTimeEqual(signature, expected);
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

function optionalString(value: FormDataEntryValue | null) {
  const stringValue = String(value ?? "").trim();
  return stringValue || undefined;
}

function twimlResponse() {
  return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export default http;
