import Link from "next/link";
import { getMe } from "@/lib/auth/server";

export default async function Dashboard() {
  const me = (await getMe())!; // AuthGate has already sent anyone else away
  const privileged = me.roles.includes("owner") || me.roles.includes("staff");
  const needs2fa = privileged && !me.mfa_enabled;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome{me.full_name ? `, ${me.full_name}` : ""}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
          Signed in as {me.email}
          {me.roles.map((r) => (
            <span key={r} className="rounded-full border border-brand/40 px-2.5 py-0.5 font-mono text-[11px] text-brand">
              {r}
            </span>
          ))}
        </p>
      </div>

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

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Projects", "Your projects, milestones and progress.", "/app/projects"],
          ["Documents", "Agreements and other project files.", "/app/documents"],
          ["Billing", "Quotations, invoices and payments.", "/app/billing"],
        ].map(([title, text, href]) => {
          const card = (
            <>
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
              {!href && <p className="mt-3 font-mono text-[11px] text-muted">Coming soon</p>}
            </>
          );
          return href ? (
            <Link key={title} href={href} className="rounded-xl border border-line bg-surface p-5 hover:border-brand/60">
              {card}
            </Link>
          ) : (
            <div key={title} className="rounded-xl border border-line bg-surface p-5">
              {card}
            </div>
          );
        })}
      </div>
    </div>
  );
}
