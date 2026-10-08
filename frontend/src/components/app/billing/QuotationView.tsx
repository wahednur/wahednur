"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/auth/ui";
import { api, PLANS, type Invoice, type Quotation } from "@/lib/api";
import { Badge, btn, field, ghost, PdfButton } from "./Bits";
import QuoteDocument from "./QuoteDocument";

export default function QuotationView({ id, staff }: { id: string; staff: boolean }) {
  const [q, setQ] = useState<Quotation | null>(null);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    api<Quotation>("GET", `/quotations/${id}/`).then((r) => {
      if (r.ok) setQ(r.data);
      else if (r.status === 404) setMissing(true);
      else setError(r.error);
    });
  }, [id, tick]);

  async function act(action: string, body?: unknown) {
    setError("");
    const r = await api<Invoice>("POST", `/quotations/${id}/${action}/`, body ?? {});
    if (!r.ok) setError(r.error);
    else setTick((t) => t + 1);
  }

  if (missing) return <p className="text-sm text-muted">This quotation does not exist or is not yours.</p>;
  if (!q) return error ? <Alert>{error}</Alert> : <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted">{q.number}</p>
          <p className="mt-1 text-sm text-muted">
            <Link href={`/app/projects/${q.project}`} className="hover:text-brand">
              {q.project_title}
            </Link>
            {staff && ` · ${q.client_email}`}
          </p>
        </div>
        <Badge value={q.status} />
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="overflow-hidden rounded-2xl border border-line print:border-0">
        <QuoteDocument q={q} />
      </div>

      <div className="no-print flex flex-wrap items-center gap-3">
        <button type="button" className={ghost} onClick={() => window.print()}>
          Print or save as PDF
        </button>
        <PdfButton path={`/quotations/${id}/pdf/`} name={`${q.number}.pdf`} />
        {staff && q.status === "draft" && (
          <button className={btn} onClick={() => window.confirm("Send this quotation to the client?") && act("send")}>
            Send to client
          </button>
        )}
        {q.status === "sent" && (
          <>
            <button className={btn} onClick={() => window.confirm("Accept this quotation?") && act("accept")}>
              Accept
            </button>
            <button className={ghost} onClick={() => window.confirm("Decline this quotation?") && act("reject")}>
              Decline
            </button>
          </>
        )}
        {q.invoice_id && (
          <Link href={`/app/billing/invoices/${q.invoice_id}`} className="text-sm font-medium text-brand hover:underline">
            View invoice →
          </Link>
        )}
      </div>

      {staff && q.status === "accepted" && !q.invoice_id && (
        <form
          className="no-print space-y-3 rounded-xl border border-line bg-surface p-5 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const body: Record<string, unknown> = { installments: PLANS[String(f.get("plan"))].steps };
            if (f.get("due_date")) body.due_date = f.get("due_date");
            void act("convert", body);
          }}
        >
          <h2 className="font-semibold">Create the invoice</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              Payment plan
              <select name="plan" defaultValue="full" className={field}>
                {Object.entries(PLANS).map(([k, p]) => (
                  <option key={k} value={k}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Due date
              <input name="due_date" type="date" className={field} />
            </label>
          </div>
          <button className={btn}>Create draft invoice</button>
        </form>
      )}
    </div>
  );
}
