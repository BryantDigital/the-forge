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
            <!doctype html>
            <html lang="en">
              <body style="margin:0;padding:0;background:#0a0a0b">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#0a0a0b">
                  <tr><td height="6" style="height:6px;background:#b81921"></td></tr>
                  <tr>
                    <td style="padding:34px 16px 42px">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;border-collapse:collapse">
                        <tr>
                          <td style="padding:0 4px 26px">
                            <img src="${siteUrl.replace(/\/$/, "")}/images/forge-logo-white.png" width="220" alt="The Forge" style="display:block;width:220px;max-width:70%;height:auto;border:0">
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:38px;background:#f8f4ed;color:#171616;font-family:Arial,Helvetica,sans-serif">
                            <p style="margin:0 0 12px;color:#b81921;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase">Secure family account</p>
                            <h1 style="margin:0 0 18px;color:#0d0d0e;font-family:Impact,'Arial Narrow',Arial,sans-serif;font-size:38px;line-height:1.02;text-transform:uppercase">Enter the arena.</h1>
                            <p style="margin:0 0 24px;color:#4d4944;font-size:16px;line-height:1.65">Use this one-time code to securely open your Forge account.</p>
                            <div style="padding:22px 18px;border-left:5px solid #b81921;background:#111;color:#fff;text-align:center;font-size:36px;font-weight:800;letter-spacing:10px">${otp}</div>
                            <p style="margin:24px 0 0;color:#706a62;font-size:13px;line-height:1.6">This code expires in 10 minutes. If you did not request it, no action is needed.</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:24px 4px 0;color:#908d87;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6">
                            <strong style="color:#fff;letter-spacing:.08em;text-transform:uppercase">Faith · Fitness · Fellowship · Fun</strong><br>
                            The Forge Christian Ministries · Virginia Beach, Virginia
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
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
