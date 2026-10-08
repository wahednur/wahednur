import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Button, Card, field, Notice } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const { me, signIn, verifyCode, isStaff } = useAuth();
  const [step, setStep] = useState<"password" | "code">("password");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (me && isStaff) return <Navigate to="/" replace />;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const out =
      step === "password"
        ? await signIn(String(f.get("email")), String(f.get("password")))
        : await verifyCode(String(f.get("code")));
    setBusy(false);
    if (out === "code") setStep("code");
    else if (out !== "ok") setError(out);
  }

  return (
    <div className="grid min-h-full place-items-center px-4 py-10">
      <Card className="w-full max-w-sm p-7">
        <h1 className="text-xl font-semibold">Admin sign in</h1>
        <p className="mt-1 text-sm text-muted">
          {step === "password" ? "For the owner and staff only." : "Enter the 6-digit code from your authenticator app."}
        </p>
        {me && !isStaff && <div className="mt-4"><Notice>This account is not staff. Sign in with a staff account.</Notice></div>}
        {error && <div className="mt-4"><Notice>{error}</Notice></div>}
        <form onSubmit={submit} className="mt-5 space-y-4">
          {step === "password" ? (
            <>
              <label className="block text-sm">
                Email
                <input name="email" type="email" required autoComplete="email" maxLength={254} className={field} />
              </label>
              <label className="block text-sm">
                Password
                <input name="password" type="password" required autoComplete="current-password" className={field} />
              </label>
            </>
          ) : (
            <label className="block text-sm">
              Code
              <input name="code" inputMode="numeric" required autoFocus autoComplete="one-time-code" className={field} />
            </label>
          )}
          <Button tone="brand" type="submit" disabled={busy} className="w-full">
            {busy ? "Please wait…" : step === "password" ? "Sign in" : "Verify"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
