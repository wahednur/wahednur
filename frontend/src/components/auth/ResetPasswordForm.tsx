"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authFetch, errorsOf, firstError } from "@/lib/auth/client";
import AuthShell from "./AuthShell";
import { Alert, Field, PASSWORD_HINT, Submit } from "./ui";

export default function ResetPasswordForm() {
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
    const result = await authFetch("POST", "/auth/password/reset", {
      key: String(form.get("code")).trim().toUpperCase(),
      password,
    });
    setBusy(false);
    if (result.status === 200 && result.body?.meta?.is_authenticated) {
      router.replace("/app");
      router.refresh();
    } else if (result.status === 200 || result.status === 401) {
      router.replace("/login?reset=1");
    } else {
      const byField: Record<string, string> = {};
      for (const err of errorsOf(result)) if (err.param && !byField[err.param]) byField[err.param] = err.message;
      setFields({ password: byField.password ?? "", code: byField.key ?? "" });
      setError(firstError(result, "That code is not right, or it has expired."));
    }
  }

  return (
    <AuthShell
      title="Choose a new password"
      intro="Enter the code from your email and a new password."
      footer={
        <Link href="/login" className="hover:text-ink">
          Back to sign in
        </Link>
      }
    >
      {error && <Alert>{error}</Alert>}
      <form onSubmit={submit} className="space-y-5">
        <Field label="Code" name="code" autoComplete="one-time-code" required maxLength={9} error={fields.code} />
        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          hint={PASSWORD_HINT}
          error={fields.password}
        />
        <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required error={fields.confirm} />
        <Submit busy={busy}>Update password</Submit>
      </form>
    </AuthShell>
  );
}
