"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/auth/ui";
import { api, fmt, type Invoice, type Quotation } from "@/lib/api";
import NewDocument from "./NewDocument";
import { Badge } from "./Bits";

export default function BillingList({ staff }: { staff: boolean }) {
  const [quotes, setQuotes] = useState<Quotation[] | null>(null);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    api<Quotation[]>("GET", "/quotations/").then((r) => (r.ok ? setQuotes(r.data) : setError(r.error)));
    api<Invoice[]>("GET", "/invoices/").then((r) => (r.ok ? setInvoices(r.data) : setError(r.error)));
  }, [tick]);

  const row = (kind: "quotations" | "invoices", d: Quotation | Invoice) => (
    <li key={d.id}>
      <Link
        href={`/app/billing/${kind}/${d.id}`}
        className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm hover:bg-surface"
      >
        <div>
          <p className="font-medium">
            {d.number} · {d.title}
          </p>
          <p className="mt-1 text-xs text-muted">
            {d.project_title}
            {staff ? ` · ${d.client_email}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm">{fmt(d.currency, d.total)}</span>
          <Badge value={"state" in d ? d.state : d.status} />
        </div>
      </Link>
    </li>
  );

  return (
    <div className="space-y-10">
      {error && <Alert>{error}</Alert>}
      {(
        [
          ["Quotations", "quotations", quotes],
          ["Invoices", "invoices", invoices],
        ] as const
      ).map(([title, kind, list]) => (
        <section key={kind} aria-labelledby={kind}>
          <h2 id={kind} className="text-lg font-semibold">
            {title}
          </h2>
          {list === null && !error && <p className="mt-3 text-sm text-muted">Loading…</p>}
          {list?.length === 0 && <p className="mt-3 text-sm text-muted">None yet.</p>}
          {!!list?.length && (
            <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
              {list.map((d) => row(kind, d))}
            </ul>
          )}
        </section>
      ))}
      {staff && (
        <div className="grid gap-6 lg:grid-cols-2">
          <NewDocument kind="quotations" onDone={() => setTick((t) => t + 1)} />
          <NewDocument kind="invoices" onDone={() => setTick((t) => t + 1)} />
        </div>
      )}
    </div>
  );
}
