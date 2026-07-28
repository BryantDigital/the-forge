import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { emailOTP } from "better-auth/plugins";
import authConfig from "./auth.config";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

async function sendSignInCode(email: string, otp: string) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromName = process.env.SENDGRID_FROM_NAME ?? "The Forge";
  const replyToEmail = process.env.SENDGRID_REPLY_TO_EMAIL;

  if (!apiKey || !fromEmail) {
    throw new Error(
      "Email login is not configured. Add SENDGRID_API_KEY and SENDGRID_FROM_EMAIL to Convex.",
    );
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: fromEmail, name: fromName },
      ...(replyToEmail ? { reply_to: { email: replyToEmail } } : {}),
      subject: `${otp} is your Forge sign-in code`,
      content: [
        {
          type: "text/plain",
          value: `Your Forge sign-in code is ${otp}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
        },
        {
          type: "text/html",
          value: `
            <div style="background:#0b0b0c;padding:40px 20px;font-family:Arial,sans-serif;color:#f7f4ee">
              <div style="max-width:520px;margin:0 auto;border:1px solid #353538;background:#151517;padding:36px">
                <p style="margin:0 0 12px;color:#d11f2f;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">The Forge</p>
                <h1 style="margin:0 0 16px;font-size:28px;line-height:1.15">Your sign-in code</h1>
                <p style="margin:0 0 24px;color:#c9c7c2;line-height:1.6">Enter this one-time code to securely open your Forge account.</p>
                <div style="background:#080809;border-left:4px solid #d11f2f;padding:20px;text-align:center;font-size:34px;font-weight:800;letter-spacing:9px">${otp}</div>
                <p style="margin:24px 0 0;color:#8f8e8a;font-size:13px;line-height:1.5">This code expires in 10 minutes. If you did not request it, no action is needed.</p>
              </div>
            </div>
          `,
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("SendGrid OTP delivery failed", response.status, details);
    throw new Error("We could not send your sign-in code. Please try again.");
  }
}

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    trustedOrigins: [
      siteUrl,
      "https://forgeva.com",
      "https://the-forge-sooty-nine.vercel.app",
      "https://forgeva-rebuild.bryantdigital.chatgpt.site",
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        allowedAttempts: 5,
        storeOTP: "hashed",
        async sendVerificationOTP({ email, otp, type }) {
          if (type === "sign-in") {
            await sendSignInCode(email, otp);
          }
        },
      }),
      convex({ authConfig }),
    ],
  });
