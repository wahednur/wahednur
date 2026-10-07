"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authFetch, firstError } from "@/lib/auth/client";
import AuthShell from "./AuthShell";
import { Alert, Field, Submit } from "./ui";

export default function VerifyEmailForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const code = String(new FormData(e.currentTarget).get("code")).trim().toUpperCase();
    const result = await authFetch("POST", "/auth/email/verify", { key: code });
    setBusy(false);
    if (result.status === 200) {
      router.replace("/app");
      router.refresh();
    } else {
      setError(firstError(result, "That code is not right, or it has expired."));
    }
  }

  async function resend() {
    setError("");
    setInfo("");
    const result = await authFetch("POST", "/auth/email/verify/resend");
    if (result.status === 200 || result.status === 401) setInfo("A new code is on its way.");
    else if (result.status === 409)
      // The server allows only a few resends per sign-up, or this sign-up session has ended.
      setError("You have used all the resends for this sign-up, or it has expired. Please sign up again to get a fresh code.");
    else setError(firstError(result));
  }

  return (
    <AuthShell
      title="Check your email"
      intro="We sent an 8-character code (like ABCD-EFGH). Enter it to finish."
      footer={
        <Link href="/login" className="hover:text-ink">
          Back to sign in
        </Link>
      }
    >
      {error && <Alert>{error}</Alert>}
      {info && <Alert kind="info">{info}</Alert>}
      <form onSubmit={submit} className="space-y-5">
        <Field label="Code" name="code" autoComplete="one-time-code" required maxLength={9} autoFocus />
        <Submit busy={busy}>Confirm</Submit>
      </form>
      <button type="button" onClick={resend} className="text-sm text-muted hover:text-ink">
        Send the code again
      </button>
    </AuthShell>
  );
}
