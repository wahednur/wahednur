"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authFetch, firstError } from "@/lib/auth/client";
import AuthShell from "./AuthShell";
import { Alert, Field, Submit } from "./ui";

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    const result = await authFetch("POST", "/auth/password/request", { email });
    setBusy(false);
    // The answer is the same whether or not the address has an account.
    if (result.status === 200 || result.status === 401) router.push("/reset-password");
    else setError(firstError(result));
  }

  return (
    <AuthShell
      title="Reset your password"
      intro="Enter your email. If it has an account, we will send a code."
      footer={
        <Link href="/login" className="hover:text-ink">
          Back to sign in
        </Link>
      }
    >
      {error && <Alert>{error}</Alert>}
      <form onSubmit={submit} className="space-y-5">
        <Field label="Email" name="email" type="email" autoComplete="email" required maxLength={254} />
        <Submit busy={busy}>Send code</Submit>
      </form>
    </AuthShell>
  );
}
