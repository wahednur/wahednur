"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/auth/ui";
import { api, fmt, METHODS, type Invoice } from "@/lib/api";
import { Badge, btn, field, ghost, PdfButton } from "./Bits";
import { ItemsTable } from "./Totals";

export default function InvoiceView({ id, staff }: { id: string; staff: boolean }) {
  const [inv, setInv] = useState<Invoice | null>(null);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    api<Invoice>("GET", `/invoices/${id}/`).then((r) => {
      if (r.ok) setInv(r.data);
      else if (r.status === 404) setMissing(true);
      else setError(r.error);
    });
  }, [id, tick]);

  async function act(action: string, body?: unknown) {
    setError("");
    const r = await api("POST", `/invoices/${id}/${action}/`, body ?? {});
    if (!r.ok) setError(r.error);
    else setTick((t) => t + 1);
    return r.ok;
  }

  if (missing) return <p className="text-sm text-muted">This invoice does not exist or is not yours.</p>;
  if (!inv) return error ? <Alert>{error}</Alert> : <p className="text-sm text-muted">Loading…</p>;
  const cur = inv.currency;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted">{inv.number}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{inv.title}</h1>
          <p className="mt-1 text-sm text-muted">
            <Link href={`/app/projects/${inv.project}`} className="hover:text-brand">
              {inv.project_title}
            </Link>
            {staff && ` · ${inv.client_email}`}
            {inv.due_date && ` · due ${inv.due_date}`}
          </p>
        </div>
        <Badge value={inv.state} />
      </header>
      {error && <Alert>{error}</Alert>}
      <ItemsTable doc={inv} />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Total", inv.total],
          ["Paid", inv.paid_total],
          ["Still due", inv.outstanding],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-surface p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-lg font-semibold">{fmt(cur, value)}</p>
          </div>
        ))}
      </div>

      <section aria-labelledby="sched">
        <h2 id="sched" className="text-lg font-semibold">
          Payment plan
        </h2>
        <ol className="mt-3 divide-y divide-line rounded-xl border border-line">
          {inv.installments.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p className="font-medium">{i.label}</p>
                <p className="mt-1 font-mono text-[11px] text-muted">{i.due_date ? `Due ${i.due_date}` : "No due date"}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted">
                  {fmt(cur, i.paid)} of {fmt(cur, i.amount)}
                </span>
                <Badge value={i.state} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="pays">
        <h2 id="pays" className="text-lg font-semibold">
          Payments received
        </h2>
        {inv.payments.length === 0 && <p className="mt-3 text-sm text-muted">No payments yet.</p>}
        <ul className="mt-3 space-y-2 text-sm">
          {inv.payments.map((p) => (
            <li key={p.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-line p-3">
              <span>
                {fmt(cur, p.amount)} · {METHODS.find(([k]) => k === p.method)?.[1]}
                {p.reference && ` · ${p.reference}`}
              </span>
              <span className="font-mono text-[11px] text-muted">{p.paid_on}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <PdfButton path={`/invoices/${id}/pdf/`} name={`${inv.number}.pdf`} />
        {staff && inv.status === "draft" && (
          <button className={btn} onClick={() => window.confirm("Issue this invoice? It cannot be edited afterwards.") && act("issue")}>
            Issue invoice
          </button>
        )}
        {staff && inv.status !== "cancelled" && inv.payments.length === 0 && (
          <button className={ghost} onClick={() => window.confirm("Cancel this invoice?") && act("cancel")}>
            Cancel invoice
          </button>
        )}
      </div>

      {staff && inv.status === "issued" && Number(inv.outstanding) > 0 && (
        <form
          className="space-y-3 rounded-xl border border-line bg-surface p-5 text-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            const ok = await act("payments", {
              amount: f.get("amount"),
              method: f.get("method"),
              paid_on: f.get("paid_on"),
              reference: f.get("reference"),
            });
            if (ok) form.reset();
          }}
        >
          <h2 className="font-semibold">Record a payment</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <label>
              Amount
              <input name="amount" type="number" min="0.01" step="0.01" max={inv.outstanding} required className={field} />
            </label>
            <label>
              Method
              <select name="method" defaultValue="bank" className={field}>
                {METHODS.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date received
              <input name="paid_on" type="date" required className={field} />
            </label>
            <label>
              Reference
              <input name="reference" maxLength={100} placeholder="Transaction ID" className={field} />
            </label>
          </div>
          <button className={btn}>Record payment</button>
        </form>
      )}
    </div>
  );
}
