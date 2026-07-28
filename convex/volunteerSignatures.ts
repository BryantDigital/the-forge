"use node";

import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { createVolunteerAgreementPdf } from "../lib/volunteer-agreement-pdf";

export const sign = action({
  args: {
    token: v.string(),
    signatureText: v.string(),
    electronicConsentAccepted: v.boolean(),
    agreementAccepted: v.boolean(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.electronicConsentAccepted || !args.agreementAccepted) {
      throw new ConvexError("You must review and accept the agreement before signing.");
    }
    const tokenHash = await sha256(args.token);
    const context = await ctx.runQuery(internal.volunteers.getSigningContext, {
      tokenHash,
    });
    if (!context) {
      throw new ConvexError("This signing link is invalid, expired, or already completed.");
    }
    const signatureText = clean(args.signatureText, 120);
    if (
      signatureText.toLowerCase() !==
      context.request.signerName.toLowerCase()
    ) {
      throw new ConvexError(
        `Type your full legal name exactly as ${context.request.signerName}.`,
      );
    }

    const signedAt = Date.now();
    const documentId = `FORGE-${String(context.request._id).slice(-12).toUpperCase()}`;
    const bytes = await createVolunteerAgreementPdf({
      title: context.request.documentTitle,
      body: context.request.documentBody,
      templateVersion: context.request.templateVersion,
      volunteerName: context.request.signerName,
      volunteerEmail: context.request.signerEmail,
      signatureText,
      signedAt,
      documentId,
    });
    const documentSha256 = await sha256Bytes(bytes);
    const storageId = await ctx.storage.store(
      new Blob([Buffer.from(bytes)], { type: "application/pdf" }),
    );
    await ctx.runMutation(internal.volunteers.completeSignature, {
      signatureRequestId: context.request._id,
      storageId,
      documentSha256,
      signatureText,
      signedAt,
      consentAcceptedAt: signedAt,
      userAgent: clean(args.userAgent, 500) || undefined,
    });
    const documentUrl = await ctx.storage.getUrl(storageId);
    return {
      approved: true,
      signedAt,
      documentSha256,
      documentUrl,
    };
  },
});

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function sha256Bytes(value: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", Buffer.from(value));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function bytesToBase64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}
