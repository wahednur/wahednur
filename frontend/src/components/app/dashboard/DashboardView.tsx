"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Progress from "@/components/app/Progress";
import { Alert } from "@/components/auth/ui";
import { api, fmt, STATUS_LABEL, type DashboardData } from "@/lib/api";
import Icon from "./Icons";

const STAT_LABEL: Record<string, string> = {
  active_projects: "Projects in progress",
  proposals: "Proposals",
  open_invoices: "Unpaid invoices",
  quotes_out: "Quotations sent",
  subscriptions: "Active subscriptions",
  billing_this_week: "Subscriptions billed this week",
  products_for_sale: "Products on sale",
  unpaid_shop_orders: "Shop orders not yet paid",
  shop_in_progress: "Shop orders in progress",
};

const SHORTCUTS = [
  { href: "/app/projects", label: "Projects", hint: "Progress and updates", icon: "projects" },
  { href: "/app/billing", label: "Quotations & invoices", hint: "Accept, pay, download", icon: "billing" },
  { href: "/app/documents", label: "Documents", hint: "Your private files", icon: "documents" },
  { href: "/app/shop", label: "Orders", hint: "Shop purchases", icon: "orders" },
  { href: "/app/subscriptions", label: "Subscriptions", hint: "Monthly and yearly plans", icon: "subscriptions" },
  { href: "/packages", label: "Packages", hint: "Ready-made offers", icon: "packages" },
];

const card = "rounded-2xl border border-line bg-surface";

function Heading({ id, children, action }: { id: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-sm font-semibold uppercase tracking-wide text-muted">
        {children}
      </h2>
      {action}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading your numbers">
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((j) => (
            <div key={j} className="h-24 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<DashboardData>("GET", "/dashboard/").then((r) => (r.ok ? setData(r.data) : setError(r.error)));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Skeleton />;

  const currencies = Object.keys(data.money);
  const staff = data.role === "staff";

  return (
    <div className="space-y-10">
      {!staff && (
        <section aria-labelledby="go">
          <Heading id="go">Quick links</Heading>
          <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
            {SHORTCUTS.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className={`${card} group flex h-full items-center gap-3 p-4 transition hover:border-brand/60 hover:bg-surface-2`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                    <Icon name={s.icon} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{s.label}</span>
                    <span className="block text-xs text-muted">{s.hint}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="att">
        <Heading id="att">{staff ? "Needs your attention" : "Waiting for you"}</Heading>
        {data.attention.length === 0 ? (
          <p className={`${card} mt-3 flex items-center gap-3 p-5 text-sm text-muted`}>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand/10 text-brand">✓</span>
            Nothing is waiting. {staff ? "All caught up." : "You are all set."}
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.attention.map((a) => (
              <li key={a.key}>
                <Link
                  href={a.href}
                  className="group flex h-full items-center justify-between gap-4 rounded-2xl border border-amber-400/40 bg-amber-400/5 p-4 text-sm transition hover:border-amber-400/70 hover:bg-amber-400/10"
                >
                  <span>{a.label}</span>
                  <span className="flex items-center gap-2 text-amber-200">
                    <span className="font-mono text-2xl font-semibold">{a.count}</span>
                    <span className="transition group-hover:translate-x-0.5">
                      <Icon name="arrow" />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {currencies.length > 0 && (
        <section aria-labelledby="owed">
          <Heading id="owed">{staff ? "Still owed to you" : "Still to pay"}</Heading>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {currencies.map((c) => {
              const late = Number(data.money[c].overdue) > 0;
              return (
                <div key={c} className={`${card} p-5 ${late ? "border-red-400/40" : ""}`}>
                  <p className="font-mono text-xs text-muted">{c}</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight">{fmt(c, data.money[c].owed)}</p>
                  {late ? (
                    <p className="mt-2 text-xs text-red-300">{fmt(c, data.money[c].overdue)} is past its due date</p>
                  ) : (
                    <p className="mt-2 text-xs text-muted">Nothing is overdue</p>
                  )}
                </div>
              );
            })}
          </div>
          <Link href="/app/billing" className="mt-3 inline-block text-sm text-brand hover:underline">
            Open billing →
          </Link>
        </section>
      )}

      {data.this_month && Object.keys(data.this_month).length > 0 && (
        <section aria-labelledby="month">
          <Heading
            id="month"
            action={
              <Link href="/app/accounting" className="text-sm text-brand hover:underline">
                Open accounting →
              </Link>
            }
          >
            This month
          </Heading>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(data.this_month).map(([c, m]) => (
              <div key={c} className={`${card} p-5 text-sm`}>
                <p className="font-mono text-xs text-muted">{c}</p>
                <dl className="mt-2 space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-muted">Received</dt>
                    <dd>{fmt(c, m.received)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Spent</dt>
                    <dd>{fmt(c, m.spent)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-line pt-2 font-semibold">
                    <dt>Net</dt>
                    <dd>{fmt(c, m.net)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>
      )}

      {staff && (
        <section aria-labelledby="stats">
          <Heading id="stats">At a glance</Heading>
          <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Object.entries(data.stats).map(([key, value]) => (
              <div key={key} className={`${card} p-4`}>
                <dd className="text-2xl font-semibold">{value}</dd>
                <dt className="mt-1 text-xs text-muted">{STAT_LABEL[key] ?? key}</dt>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section aria-labelledby="proj">
        <Heading
          id="proj"
          action={
            <Link href="/app/projects" className="text-sm text-brand hover:underline">
              All projects →
            </Link>
          }
        >
          Projects in progress
        </Heading>
        {data.projects.length === 0 ? (
          <p className={`${card} mt-3 p-5 text-sm text-muted`}>No project is in progress right now.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {data.projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/app/projects/${p.id}`}
                  className={`${card} block p-5 transition hover:border-brand/60 hover:bg-surface-2`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{p.title}</p>
                    <span className="shrink-0 rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-muted">
                      {STATUS_LABEL[p.status]}
                    </span>
                  </div>
                  <div className="mt-4">
                    <Progress value={p.progress} />
                  </div>
                  {p.due_date && <p className="mt-3 font-mono text-[11px] text-muted">Due {p.due_date}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
