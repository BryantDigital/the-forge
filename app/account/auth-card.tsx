"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { authClient } from "../../lib/auth-client";
import { AccountDashboard } from "./account-dashboard";

export function AuthCard() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const viewer = useQuery(api.adminAuth.getViewer);
  const bootstrapOwner = useMutation(api.adminAuth.bootstrapOwner);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<
    { type: "error" | "success"; text: string } | null
  >(null);

  if (sessionPending) {
    return (
      <div className="panel account-auth-card">
        <p className="eyebrow">Secure account</p>
        <h2>Opening your Forge account…</h2>
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="panel account-auth-card">
        <p className="eyebrow">Signed in</p>
        <h2>Welcome back, {session.user.name || "Forge family"}.</h2>
        <p>{session.user.email}</p>

        <AccountDashboard />

        <div className="account-access-grid">
          <div>
            <span>Family account</span>
            <strong>Connected</strong>
            <p>Saved children, registrations, and giving history will appear here.</p>
          </div>
          <div>
            <span>Forge administration</span>
            <strong>{viewer?.admin ? formatRole(viewer.admin.role) : "Not assigned"}</strong>
            <p>
              {viewer?.admin
                ? "Your administrator permissions are active."
                : "Administrator access is granted separately by The Forge."}
            </p>
          </div>
        </div>

        {viewer?.canBootstrapOwner && !viewer.admin && (
          <button
            className="choice account-owner-button"
            type="button"
            onClick={async () => {
              setMessage(null);
              try {
                await bootstrapOwner();
                setMessage({
                  type: "success",
                  text: "Owner access is active. You can now open Forge Admin.",
                });
              } catch {
                setMessage({
                  type: "error",
                  text: "This email is not configured as the Forge owner.",
                });
              }
            }}
          >
            Activate owner access
          </button>
        )}

        {message && (
          <p className={`form-status form-status--${message.type}`} aria-live="polite">
            {message.text}
          </p>
        )}

        <div className="account-actions">
          {viewer?.admin && (
            <a className="button button--red" href="/admin">
              Open Forge Admin <span aria-hidden="true">→</span>
            </a>
          )}
          <button
            className="choice"
            type="button"
            onClick={() => authClient.signOut().then(() => window.location.assign("/"))}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel account-auth-card">
      <p className="eyebrow">Passwordless access</p>
      <h2>{step === "email" ? "Enter the arena." : "Check your email."}</h2>
      <p>
        {step === "email"
          ? "Enter your email and we’ll send a secure six-digit code. No password required."
          : `We sent a six-digit sign-in code to ${email}. It expires in 10 minutes.`}
      </p>

      <form
        className="field-grid account-auth-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setSubmitting(true);
          setMessage(null);

          if (step === "email") {
            const result = await authClient.emailOtp.sendVerificationOtp({
              email: email.trim(),
              type: "sign-in",
            });

            setSubmitting(false);

            if (result.error) {
              setMessage({
                type: "error",
                text:
                  result.error.message ??
                  "We couldn't send the code. Confirm the email and try again.",
              });
              return;
            }

            setStep("code");
            setMessage({
              type: "success",
              text: "Code sent. Check your inbox and spam folder.",
            });
            return;
          }

          const result = await authClient.signIn.emailOtp({
            email: email.trim(),
            otp: code,
          });

          setSubmitting(false);

          if (result.error) {
            setMessage({
              type: "error",
              text:
                result.error.message ??
                "That code is incorrect or expired. Request a new code and try again.",
            });
            return;
          }

          window.location.assign("/account");
        }}
      >
        {step === "email" ? (
          <label className="field field--full">
            <span>Email address</span>
            <input
              className="form-control"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="parent@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />
          </label>
        ) : (
          <label className="field field--full">
            <span>Six-digit code</span>
            <input
              className="form-control account-code-input"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              required
              autoFocus
            />
          </label>
        )}
        <button
          className="button button--red field--full"
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? step === "email"
              ? "Sending code…"
              : "Verifying…"
            : step === "email"
              ? "Email me a code"
              : "Verify and sign in"}
        </button>

        {step === "code" && (
          <div className="account-code-actions field--full">
            <button
              className="text-link"
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setMessage(null);
              }}
            >
              Use a different email
            </button>
            <button
              className="text-link"
              type="button"
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                setMessage(null);
                const result = await authClient.emailOtp.sendVerificationOtp({
                  email: email.trim(),
                  type: "sign-in",
                });
                setSubmitting(false);
                setMessage(
                  result.error
                    ? {
                        type: "error",
                        text: result.error.message ?? "We couldn't resend the code.",
                      }
                    : { type: "success", text: "A new code is on its way." },
                );
              }}
            >
              Resend code
            </button>
          </div>
        )}
      </form>

      {message && (
        <p className={`form-status form-status--${message.type}`} aria-live="polite">
          {message.text}
        </p>
      )}

      <p className="account-auth-card__fine-print">
        First time here? Verifying your email automatically creates your private
        Forge account. Event registration still never requires a login.
      </p>
    </div>
  );
}

function formatRole(role: "owner" | "event_manager" | "checkin") {
  if (role === "owner") return "Owner";
  if (role === "event_manager") return "Events manager";
  return "Check-in volunteer";
}
