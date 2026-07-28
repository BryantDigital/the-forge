"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { authClient } from "../../lib/auth-client";

type AuthMode = "sign-in" | "sign-up";

export function AuthCard() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const viewer = useQuery(api.adminAuth.getViewer);
  const bootstrapOwner = useMutation(api.adminAuth.bootstrapOwner);
  const [mode, setMode] = useState<AuthMode>("sign-in");
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
      <div className="auth-mode-toggle" role="tablist" aria-label="Account access">
        <button
          type="button"
          role="tab"
          className={mode === "sign-in" ? "is-selected" : ""}
          aria-selected={mode === "sign-in"}
          onClick={() => {
            setMode("sign-in");
            setMessage(null);
          }}
        >
          Log in
        </button>
        <button
          type="button"
          role="tab"
          className={mode === "sign-up" ? "is-selected" : ""}
          aria-selected={mode === "sign-up"}
          onClick={() => {
            setMode("sign-up");
            setMessage(null);
          }}
        >
          Create account
        </button>
      </div>

      <p className="eyebrow">
        {mode === "sign-in" ? "Welcome back" : "Optional family account"}
      </p>
      <h2>{mode === "sign-in" ? "Enter the arena." : "Make the next RSVP faster."}</h2>
      <p>
        {mode === "sign-in"
          ? "Use your Forge account to access family records or administration."
          : "An account is optional. Event registration will never require one."}
      </p>

      <form
        className="field-grid account-auth-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const email = String(form.get("email") ?? "").trim();
          const password = String(form.get("password") ?? "");
          const name = String(form.get("name") ?? "").trim();

          setSubmitting(true);
          setMessage(null);

          const result =
            mode === "sign-in"
              ? await authClient.signIn.email({ email, password })
              : await authClient.signUp.email({ email, password, name });

          setSubmitting(false);

          if (result.error) {
            setMessage({
              type: "error",
              text:
                result.error.message ??
                (mode === "sign-in"
                  ? "We couldn't log you in. Check your email and password."
                  : "We couldn't create the account. Please try again."),
            });
            return;
          }

          window.location.assign("/account");
        }}
      >
        {mode === "sign-up" && (
          <label className="field field--full">
            <span>Full name</span>
            <input className="form-control" name="name" autoComplete="name" required />
          </label>
        )}
        <label className="field field--full">
          <span>Email address</span>
          <input
            className="form-control"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="parent@example.com"
            required
          />
        </label>
        <label className="field field--full">
          <span>Password</span>
          <input
            className="form-control"
            name="password"
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            minLength={10}
            required
          />
          <small>At least 10 characters.</small>
        </label>
        <button
          className="button button--red field--full"
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? "Securing your account…"
            : mode === "sign-in"
              ? "Log in"
              : "Create my account"}
        </button>
      </form>

      {message && (
        <p className={`form-status form-status--${message.type}`} aria-live="polite">
          {message.text}
        </p>
      )}

      <p className="account-auth-card__fine-print">
        Looking for an RSVP? Your confirmation email will contain a secure link
        to edit or cancel it without signing in.
      </p>
    </div>
  );
}

function formatRole(role: "owner" | "event_manager" | "checkin") {
  if (role === "owner") return "Owner";
  if (role === "event_manager") return "Events manager";
  return "Check-in volunteer";
}
