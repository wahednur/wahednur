"use client";

import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, errorsOf, firstError, isReauthRequired } from "@/lib/auth/client";
import type { ApiResult } from "@/lib/auth/types";
import { Alert, Field, PASSWORD_HINT, Submit } from "./ui";

type Action = () => Promise<ApiResult>;

const card = "rounded-xl border border-line bg-surface p-6";

export default function SecurityPanel({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  // Sensitive changes ask for the password again. The pending action is retried after that.
  const pending = useRef<{ run: Action; done: (r: ApiResult) => void } | null>(null);
  const [askPassword, setAskPassword] = useState(false);
  const [reauthError, setReauthError] = useState("");

  const guarded = useCallback(
    async (run: Action, done: (r: ApiResult) => void) => {
      const result = await run();
      if (isReauthRequired(result)) {
        pending.current = { run, done };
        setReauthError("");
        setAskPassword(true);
      } else done(result);
    },
    [],
  );

  async function confirmPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));
    const r = await authFetch("POST", "/auth/reauthenticate", { password });
    if (r.status !== 200) return setReauthError(firstError(r, "That password is not right."));
    setAskPassword(false);
    const job = pending.current;
    pending.current = null;
    if (job) job.done(await job.run());
  }

  return (
    <div className="space-y-6">
      {askPassword && (
        <div className={card} role="dialog" aria-label="Confirm your password">
          <h2 className="font-semibold">Confirm your password</h2>
          <p className="mt-1 text-sm text-muted">This change needs your password again.</p>
          <form onSubmit={confirmPassword} className="mt-4 space-y-4">
            {reauthError && <Alert>{reauthError}</Alert>}
            <Field label="Password" name="password" type="password" autoComplete="current-password" required autoFocus />
            <Submit busy={false}>Continue</Submit>
          </form>
        </div>
      )}
      <PasswordCard hasPassword={hasPassword} onChanged={() => router.refresh()} />
      <TotpCard hasPassword={hasPassword} guarded={guarded} onChanged={() => router.refresh()} />
    </div>
  );
}

type Guarded = (run: Action, done: (r: ApiResult) => void) => Promise<void>;

function PasswordCard({ hasPassword, onChanged }: { hasPassword: boolean; onChanged: () => void }) {
  const [msg, setMsg] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setMsg(null);
    setFields({});
    const next = String(form.get("new"));
    if (next !== String(form.get("confirm"))) return setFields({ confirm: "The passwords do not match." });
    const body: Record<string, string> = { new_password: next };
    if (hasPassword) body.current_password = String(form.get("current"));
    const r = await authFetch("POST", "/account/password/change", body);
    if (r.status === 200) {
      formEl.reset();
      setMsg({ kind: "info", text: hasPassword ? "Password changed." : "Password set. You can now sign in with email and password too." });
      onChanged();
    } else {
      const byField: Record<string, string> = {};
      for (const err of errorsOf(r)) if (err.param && !byField[err.param]) byField[err.param] = err.message;
      setFields({ current: byField.current_password ?? "", new: byField.new_password ?? "" });
      if (!byField.current_password && !byField.new_password) setMsg({ kind: "error", text: firstError(r) });
    }
  }

  return (
    <section className={card}>
      <h2 className="font-semibold">{hasPassword ? "Change password" : "Set a password"}</h2>
      {!hasPassword && (
        <p className="mt-1 text-sm text-muted">
          You signed in with Google. Set a password to also sign in with your email.
        </p>
      )}
      <form onSubmit={submit} className="mt-4 space-y-4">
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
        {hasPassword && (
          <Field label="Current password" name="current" type="password" autoComplete="current-password" required error={fields.current} />
        )}
        <Field label="New password" name="new" type="password" autoComplete="new-password" required minLength={12} hint={PASSWORD_HINT} error={fields.new} />
        <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required error={fields.confirm} />
        <Submit busy={false}>{hasPassword ? "Change password" : "Set password"}</Submit>
      </form>
    </section>
  );
}

type Totp = { enabled: boolean; secret?: string; url?: string } | null;

function TotpCard({
  hasPassword,
  guarded,
  onChanged,
}: {
  hasPassword: boolean;
  guarded: Guarded;
  onChanged: () => void;
}) {
  const [totp, setTotp] = useState<Totp>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await authFetch("GET", "/account/authenticators/totp");
    if (r.status === 200) setTotp({ enabled: true });
    else {
      const meta = r.body?.meta as { secret?: string; totp_url?: string } | undefined;
      setTotp({ enabled: false, secret: meta?.secret, url: meta?.totp_url });
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function enable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const code = String(new FormData(e.currentTarget).get("code")).trim();
    await guarded(
      () => authFetch("POST", "/account/authenticators/totp", { code }),
      async (r) => {
        if (r.status !== 200) return setError(firstError(r, "That code is not right. Try the current one."));
        await load();
        onChanged();
        await showCodes();
      },
    );
  }

  async function showCodes() {
    await guarded(
      () => authFetch("GET", "/account/authenticators/recovery-codes"),
      (r) => {
        const list = (r.body?.data as { unused_codes?: string[] } | undefined)?.unused_codes;
        if (r.status === 200 && list) setCodes(list);
        else setError(firstError(r));
      },
    );
  }

  async function disable() {
    setError("");
    await guarded(
      () => authFetch("DELETE", "/account/authenticators/totp"),
      async (r) => {
        if (r.status !== 200) return setError(firstError(r));
        setCodes(null);
        await load();
        onChanged();
      },
    );
  }

  return (
    <section className={card}>
      <h2 className="font-semibold">Two-factor authentication</h2>
      <p className="mt-1 text-sm text-muted">
        A code from an authenticator app (Google Authenticator, Authy, 1Password…) is asked for after your password.
      </p>
      {!hasPassword && (
        <p className="mt-3 text-sm text-amber-200">Set a password above first. It is needed to confirm this change.</p>
      )}
      <div className="mt-4 space-y-4">
        {error && <Alert>{error}</Alert>}
        {totp === null && <p className="text-sm text-muted">Loading…</p>}
        {totp && !totp.enabled && (
          <>
            {totp.url && (
              <div className="flex flex-wrap items-center gap-5">
                <div className="rounded-lg bg-white p-3">
                  <QRCodeSVG value={totp.url} size={148} />
                </div>
                <div className="text-sm text-muted">
                  <p>Scan with your authenticator app, or type this key:</p>
                  <p className="mt-2 break-all font-mono text-ink">{totp.secret}</p>
                </div>
              </div>
            )}
            <form onSubmit={enable} className="space-y-4">
              <Field label="6-digit code" name="code" inputMode="numeric" autoComplete="one-time-code" required />
              <Submit busy={false}>Turn on</Submit>
            </form>
          </>
        )}
        {totp?.enabled && (
          <div className="space-y-4">
            <Alert kind="info">Two-factor authentication is on.</Alert>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={showCodes} className="rounded-md border border-line px-4 py-2 text-sm hover:border-brand/60">
                Show recovery codes
              </button>
              <button type="button" onClick={disable} className="rounded-md border border-line px-4 py-2 text-sm text-red-300 hover:border-red-400/60">
                Turn off
              </button>
            </div>
          </div>
        )}
        {codes && (
          <div className="rounded-lg border border-line bg-surface-2 p-4">
            <p className="text-sm font-medium">Recovery codes</p>
            <p className="mt-1 text-xs text-muted">Keep these somewhere safe. Each works once if you lose your phone.</p>
            <ul className="mt-3 grid grid-cols-2 gap-1 font-mono text-sm">
              {codes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
