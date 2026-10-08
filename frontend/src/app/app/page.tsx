import Link from "next/link";
import DashboardView from "@/components/app/dashboard/DashboardView";
import { getMe } from "@/lib/auth/server";

export default async function Dashboard() {
  const me = (await getMe())!; // AuthGate has already sent anyone else away
  const privileged = me.roles.includes("owner") || me.roles.includes("staff");
  const needs2fa = privileged && !me.mfa_enabled;

  return (
    <div className="space-y-8">
      <header className="glow-border relative overflow-hidden rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand/10 blur-3xl" />
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:linear-gradient(90deg,transparent,#000)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-brand/40 bg-brand/15 text-xl font-semibold text-brand">
              {(me.full_name || me.email).charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand">Your private workspace</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Welcome back{me.full_name ? `, ${me.full_name}` : ""}
              </h1>
              <p className="mt-1 truncate text-sm text-muted">{me.email}</p>
            </div>
          </div>
          <ul className="flex flex-wrap gap-2 text-xs">
            {[
              [me.email_verified, "Email verified"],
              [me.mfa_enabled, "Two-step sign-in"],
              [true, "Encrypted connection"],
            ].map(([ok, label]) => (
              <li
                key={String(label)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${
                  ok ? "border-brand/30 bg-brand/[0.07] text-brand" : "border-line text-muted"
                }`}
              >
                <span aria-hidden>{ok ? "✓" : "–"}</span>
                {label as string}
              </li>
            ))}
            {me.roles.filter((r) => r !== "client").map((r) => (
              <li key={r} className="rounded-full border border-line px-3 py-1 font-mono text-muted">{r}</li>
            ))}
          </ul>
        </div>
      </header>

      {needs2fa && (
        <div role="alert" className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-5 text-sm">
          <p className="font-semibold text-amber-200">Turn on two-factor authentication</p>
          <p className="mt-1 text-muted">
            Staff and owner features stay locked until you do. It takes a minute.
          </p>
          <Link href="/app/security" className="mt-3 inline-block font-medium text-brand hover:underline">
            Set it up →
          </Link>
        </div>
      )}

      <DashboardView shop={me.has_shop_orders} />
    </div>
  );
}
