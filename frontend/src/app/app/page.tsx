import Link from "next/link";
import DashboardView from "@/components/app/dashboard/DashboardView";
import { getMe } from "@/lib/auth/server";

export default async function Dashboard() {
  const me = (await getMe())!; // AuthGate has already sent anyone else away
  const privileged = me.roles.includes("owner") || me.roles.includes("staff");
  const needs2fa = privileged && !me.mfa_enabled;

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand/15 text-xl font-semibold text-brand">
            {(me.full_name || me.email).charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome{me.full_name ? `, ${me.full_name}` : ""}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className="truncate">{me.email}</span>
              {me.roles.map((r) => (
                <span key={r} className="rounded-full border border-brand/40 px-2.5 py-0.5 font-mono text-[11px] text-brand">
                  {r}
                </span>
              ))}
            </p>
          </div>
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

      <DashboardView />
    </div>
  );
}
