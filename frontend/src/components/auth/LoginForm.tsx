"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  authFetch,
  firstError,
  isConfigured,
  pendingFlow,
  safeNext,
} from "@/lib/auth/client";
import AuthShell from "./AuthShell";
import GoogleButton from "./GoogleButton";
import { Alert, Field, Submit } from "./ui";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [step, setStep] = useState<"password" | "code">("password");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const notice =
    params.get("reason") === "expired"
      ? "Your session ended. Please sign in again."
      : params.get("error") === "social"
        ? "Google sign-in did not complete. Try again or use your email."
        : params.get("reset")
          ? "Password updated. Sign in with the new password."
          : "";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const result =
      step === "password"
        ? await authFetch("POST", "/auth/login", {
            email: String(form.get("email")).trim(),
            password: String(form.get("password")),
          })
        : await authFetch("POST", "/auth/2fa/authenticate", { code: String(form.get("code")).trim() });
    setBusy(false);

    if (result.status === 200) {
      router.replace(next);
      router.refresh();
    } else if (pendingFlow(result, "verify_email")) {
      router.push("/verify-email");
    } else if (pendingFlow(result, "mfa_authenticate")) {
      setStep("code");
    } else {
      setError(firstError(result, "That did not work. Check your details and try again."));
    }
  }

  if (!isConfigured())
    return (
      <AuthShell title="Sign in">
        <Alert>Sign-in is not set up on this site yet.</Alert>
      </AuthShell>
    );

  return (
    <AuthShell
      title={step === "password" ? "Sign in" : "Two-factor code"}
      intro={
        step === "password"
          ? "Use your email and password, or continue with Google."
          : "Enter the 6-digit code from your authenticator app, or a recovery code."
      }
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {notice && !error && <Alert kind="info">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}
      {step === "password" && <GoogleButton callbackPath={next} />}
      <form onSubmit={submit} className="space-y-5">
        {step === "password" ? (
          <>
            <Field label="Email" name="email" type="email" autoComplete="email" required maxLength={254} />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </>
        ) : (
          <Field
            label="Code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            autoFocus
          />
        )}
        <Submit busy={busy}>{step === "password" ? "Sign in" : "Verify"}</Submit>
      </form>
      {step === "password" && (
        <p className="text-center text-sm">
          <Link href="/forgot-password" className="text-muted hover:text-ink">
            Forgot your password?
          </Link>
        </p>
      )}
    </AuthShell>
  );
}

