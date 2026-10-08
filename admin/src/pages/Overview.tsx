import { Link } from "react-router-dom";
import { Card, Loading, Notice, PageHeader, useLoad } from "@/components/ui";
import { money } from "@/lib/format";
import type { DashboardData } from "@/lib/types";

const STAT: Record<string, string> = {
  active_projects: "Projects in progress",
  proposals: "Proposals",
  open_invoices: "Unpaid invoices",
  quotes_out: "Quotations sent",
  subscriptions: "Active subscriptions",
  billing_this_week: "Billed this week",
  products_for_sale: "Products on sale",
  unpaid_shop_orders: "Shop orders unpaid",
  shop_in_progress: "Shop orders in progress",
};

/** The old links point at the website's screens; the same work now lives here. */
const MAP: [RegExp, string][] = [
  [/\/app\/messages/, "/messages"],
  [/\/app\/billing/, "/billing"],
  [/\/app\/orders/, "/requests"],
  [/\/app\/shop/, "/shop"],
  [/\/app\/subscriptions/, "/subscriptions"],
  [/\/app\/projects/, "/projects"],
];
const local = (href: string) => MAP.find(([re]) => re.test(href))?.[1] ?? "/";

export default function Overview() {
  const { data, error } = useLoad<DashboardData>("/dashboard/");
  if (error) return <Notice>{error}</Notice>;
  if (!data) return <Loading />;
  const cur = Object.keys(data.money);

  return (
    <>
      <PageHeader title="Overview" intro="What needs you today." />
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Needs your attention</h2>
      {data.attention.length === 0 ? (
        <Card className="p-5 text-sm text-muted">Nothing is waiting. All caught up.</Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.attention.map((a) => (
            <li key={a.key}>
              <Link
                to={local(a.href)}
                className="flex h-full items-center justify-between gap-4 rounded-2xl border border-amber-400/40 bg-amber-400/5 p-4 text-sm hover:border-amber-400/70"
              >
                <span>{a.label}</span>
                <span className="font-mono text-2xl font-semibold text-amber-200">{a.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {cur.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-muted">Still owed to you</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cur.map((c) => (
              <Card key={c} className={`p-5 ${Number(data.money[c].overdue) > 0 ? "border-red-400/40" : ""}`}>
                <p className="font-mono text-xs text-muted">{c}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight">{money(c, data.money[c].owed)}</p>
                <p className={`mt-2 text-xs ${Number(data.money[c].overdue) > 0 ? "text-red-300" : "text-muted"}`}>
                  {Number(data.money[c].overdue) > 0 ? `${money(c, data.money[c].overdue)} is past its due date` : "Nothing is overdue"}
                </p>
              </Card>
            ))}
          </div>
        </>
      )}

      {data.this_month && Object.keys(data.this_month).length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-muted">This month</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(data.this_month).map(([c, m]) => (
              <Card key={c} className="p-5 text-sm">
                <p className="font-mono text-xs text-muted">{c}</p>
                <dl className="mt-2 space-y-1">
                  <Row k="Received" v={money(c, m.received)} />
                  <Row k="Spent" v={money(c, m.spent)} />
                  <div className="border-t border-line pt-2">
                    <Row k="Net" v={money(c, m.net)} bold />
                  </div>
                </dl>
              </Card>
            ))}
          </div>
        </>
      )}

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-muted">At a glance</h2>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Object.entries(data.stats).map(([k, v]) => (
          <Card key={k} className="p-4">
            <dd className="text-2xl font-semibold">{v}</dd>
            <dt className="mt-1 text-xs text-muted">{STAT[k] ?? k}</dt>
          </Card>
        ))}
      </dl>
    </>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <dt className={bold ? "" : "text-muted"}>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
