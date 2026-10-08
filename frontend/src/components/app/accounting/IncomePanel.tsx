"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/auth/ui";
import { ghost } from "@/components/app/billing/Bits";
import Form, { type Field } from "@/components/app/manage/Form";
import { api, fmt, type IncomeRow } from "@/lib/api";

const SOURCES: [string, string][] = [
  ["upwork", "Upwork"], ["fiverr", "Fiverr"], ["freelancer", "Freelancer.com"],
  ["direct", "Direct client (outside the app)"], ["other", "Other"],
];
const FIELDS: Field[] = [
  { name: "earned_on", label: "Date earned", type: "date", required: true },
  { name: "source", label: "Source", type: "select", options: SOURCES },
  { name: "amount", label: "Amount the client paid (before any fee)", type: "number", step: "0.01", required: true },
  { name: "currency", label: "Currency", type: "select", options: [["USD", "USD ($)"], ["BDT", "BDT (৳)"]] },
  { name: "description", label: "What it was for", wide: true },
];

export default function IncomePanel({ start, end, onChange }: { start: string; end: string; onChange: () => void }) {
  const [rows, setRows] = useState<IncomeRow[]>([]);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const q = new URLSearchParams(Object.entries({ from: start, to: end }).filter(([, v]) => v)).toString();
  const qs = q ? `?${q}` : "";
  useEffect(() => {
    api<IncomeRow[]>("GET", `/accounting/income/${qs}`).then((r) => (r.ok ? setRows(r.data ?? []) : setError(r.error)));
  }, [qs, tick]);
  const refresh = () => {
    setTick((t) => t + 1);
    onChange();
  };
  return (
    <section aria-labelledby="inc" className="space-y-4">
      <div>
        <h2 id="inc" className="text-lg font-semibold">
          Other income
        </h2>
        <p className="mt-1 text-sm text-muted">
          Money earned outside this app&apos;s invoices (Upwork, Fiverr, a client who paid by PayPal). Enter the full amount the client paid; put the
          marketplace fee in the payout below so nothing is counted twice.
        </p>
      </div>
      {error && <Alert>{error}</Alert>}
      {rows.length === 0 && <p className="text-sm text-muted">Nothing recorded in this period.</p>}
      <ul className="divide-y divide-line rounded-xl border border-line">
        {rows.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-medium">
                {fmt(i.currency, i.amount)} · {SOURCES.find(([k]) => k === i.source)?.[1]}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted">
                {i.earned_on}
                {i.description && ` · ${i.description}`}
              </p>
            </div>
            <button
              className={ghost}
              onClick={async () => {
                if (!window.confirm("Remove this income from the books?")) return;
                const r = await api("DELETE", `/accounting/income/${i.id}/`);
                if (r.ok) refresh();
                else setError(r.error);
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="rounded-xl border border-line bg-surface p-5">
        <h3 className="mb-3 font-semibold">Add income</h3>
        <Form
          key={rows.length}
          fields={FIELDS}
          initial={{ source: "upwork", currency: "USD" }}
          submitLabel="Add income"
          onSave={async (payload) => {
            const r = await api("POST", "/accounting/income/", payload);
            if (r.ok) refresh();
            return r.ok ? "" : r.error;
          }}
        />
      </div>
    </section>
  );
}
