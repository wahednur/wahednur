"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authFetch, errorsOf, firstError, isConfigured, pendingFlow } from "@/lib/auth/client";
import AuthShell from "./AuthShell";
import GoogleButton from "./GoogleButton";
import { Alert, Field, PASSWORD_HINT, Submit } from "./ui";

export default function RegisterForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setFields({});
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm"))) {
      setFields({ confirm: "The passwords do not match." });
      return;
    }
    setBusy(true);
    const result = await authFetch("POST", "/auth/signup", {
      email: String(form.get("email")).trim(),
      password,
    });
    setBusy(false);

    if (result.status === 200) {
      router.replace("/app");
      router.refresh();
    } else if (pendingFlow(result, "verify_email")) {
      router.push("/verify-email");
    } else {
      const byField: Record<string, string> = {};
      for (const err of errorsOf(result)) if (err.param && !byField[err.param]) byField[err.param] = err.message;
      setFields(byField);
      if (Object.keys(byField).length === 0) setError(firstError(result));
    }
  }

  if (!isConfigured())
    return (
      <AuthShell title="Create an account">
        <Alert>Registration is not set up on this site yet.</Alert>
      </AuthShell>
    );

  return (
    <AuthShell
      title="Create an account"
      intro="You will get a code by email to confirm your address."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {error && <Alert>{error}</Alert>}
      <GoogleButton callbackPath="/app" />
      <form onSubmit={submit} className="space-y-5">
        <Field label="Email" name="email" type="email" autoComplete="email" required maxLength={254} error={fields.email} />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          hint={PASSWORD_HINT}
          error={fields.password}
        />
        <Field
          label="Confirm password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          error={fields.confirm}
        />
        <Submit busy={busy}>Create account</Submit>
      </form>
    </AuthShell>
  );
}
