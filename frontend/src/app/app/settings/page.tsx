import type { Metadata } from "next";
import Link from "next/link";
import { getMe } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Settings" };

const row = "flex items-center justify-between gap-4 rounded-xl border border-line p-4 text-sm transition-colors hover:border-brand/50";

export default async function SettingsPage() {
  const me = (await getMe())!;
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted">Your account, sign-in and how you hear from me.</p>
      </div>
      <section className="space-y-3" aria-labelledby="acct">
        <h2 id="acct" className="text-sm font-semibold uppercase tracking-wide text-muted">Account</h2>
        <Link href="/app/profile" className={row}><span><span className="block font-medium">Profile and addresses</span><span className="text-muted">Name, phone, delivery and billing addresses</span></span><span aria-hidden>→</span></Link>
        <Link href="/app/security" className={row}>
          <span><span className="block font-medium">Password and two-step sign-in</span>
            <span className="text-muted">{me.mfa_enabled ? "Two-step sign-in is on" : "Two-step sign-in is off"}</span></span><span aria-hidden>→</span>
        </Link>
      </section>
    </div>
  );
}
