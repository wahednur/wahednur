"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Progress from "@/components/app/Progress";
import { Alert } from "@/components/auth/ui";
import { api, fmt, STATUS_LABEL, type DashboardData } from "@/lib/api";

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

export default function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<DashboardData>("GET", "/dashboard/").then((r) => (r.ok ? setData(r.data) : setError(r.error)));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <p className="text-sm text-muted">Loading your numbers…</p>;

  const currencies = Object.keys(data.money);
  const staff = data.role === "staff";

  return (
    <div className="space-y-10">
      <section aria-labelledby="att">
        <h2 id="att" className="text-lg font-semibold">
          {staff ? "Needs your attention" : "What is waiting for you"}
        </h2>
        {data.attention.length === 0 ? (
          <p className="mt-3 rounded-xl border border-line p-5 text-sm text-muted">
            Nothing is waiting. {staff ? "All caught up." : "You are all set."}
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.attention.map((a) => (
              <li key={a.key}>
                <Link
                  href={a.href}
                  className="flex items-center justify-between gap-4 rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-sm hover:border-amber-400/70"
                >
                  <span>{a.label}</span>
                  <span className="font-mono text-xl font-semibold text-amber-200">{a.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {currencies.length > 0 && (
        <section aria-labelledby="owed">
          <h2 id="owed" className="text-lg font-semibold">
            {staff ? "Still owed to you" : "Still to pay"}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {currencies.map((c) => (
              <div key={c} className="rounded-xl border border-line bg-surface p-4">
                <p className="text-xs text-muted">{c}</p>
                <p className="mt-1 text-xl font-semibold">{fmt(c, data.money[c].owed)}</p>
                {Number(data.money[c].overdue) > 0 && (
                  <p className="mt-1 text-xs text-red-300">{fmt(c, data.money[c].overdue)} is past its due date</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.this_month && Object.keys(data.this_month).length > 0 && (
        <section aria-labelledby="month">
          <h2 id="month" className="text-lg font-semibold">
            This month
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(data.this_month).map(([c, m]) => (
              <div key={c} className="rounded-xl border border-line bg-surface p-4 text-sm">
                <p className="text-xs text-muted">{c}</p>
                <p className="mt-1">Received {fmt(c, m.received)}</p>
                <p>Spent {fmt(c, m.spent)}</p>
                <p className="mt-1 font-semibold">Net {fmt(c, m.net)}</p>
              </div>
            ))}
          </div>
          <Link href="/app/accounting" className="mt-3 inline-block text-sm text-brand hover:underline">
            Open accounting →
          </Link>
        </section>
      )}

      <section aria-labelledby="stats">
        <h2 id="stats" className="text-lg font-semibold">
          At a glance
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(data.stats).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-line bg-surface p-4">
              <dt className="text-xs text-muted">{STAT_LABEL[key] ?? key}</dt>
              <dd className="mt-1 text-2xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="proj">
        <div className="flex items-baseline justify-between">
          <h2 id="proj" className="text-lg font-semibold">
            Projects in progress
          </h2>
          <Link href="/app/projects" className="text-sm text-brand hover:underline">
            All projects →
          </Link>
        </div>
        {data.projects.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No project is in progress right now.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {data.projects.map((p) => (
              <li key={p.id}>
                <Link href={`/app/projects/${p.id}`} className="block rounded-xl border border-line bg-surface p-4 hover:border-brand/60">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{p.title}</p>
                    <span className="font-mono text-[11px] text-muted">{STATUS_LABEL[p.status]}</span>
                  </div>
                  <div className="mt-3">
                    <Progress value={p.progress} />
                  </div>
                  {p.due_date && <p className="mt-2 font-mono text-[11px] text-muted">Due {p.due_date}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
