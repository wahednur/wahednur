"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/auth/ui";
import { ghost } from "@/components/app/billing/Bits";
import Form, { type Field } from "@/components/app/manage/Form";
import { api, fmt, type ConversionReport, type SettlementRow, type Waterfall } from "@/lib/api";

const SOURCES: [string, string][] = [
  ["upwork", "Upwork"], ["fiverr", "Fiverr"], ["payoneer", "Payoneer"], ["wise", "Wise"],
  ["paypal", "PayPal"], ["bank", "Bank transfer"], ["other", "Other"],
];
const FIELDS: Field[] = [
  { name: "settled_on", label: "Date the taka arrived", type: "date", required: true },
  { name: "source", label: "Where the dollars came from", type: "select", options: SOURCES },
  { name: "earned_usd", label: "Dollars earned (before any fee), USD", type: "number", step: "0.01", required: true },
  { name: "marketplace_fee_usd", label: "Marketplace fee taken (Upwork, Fiverr...), USD", type: "number", step: "0.01" },
  { name: "transfer_fee_usd", label: "Withdrawal / cross-border fee, USD", type: "number", step: "0.01" },
  { name: "reference_rate", label: "Rate to compare with (taka per dollar)", type: "number", step: "0.0001", hint: "For example the market rate on the day you earned it. Optional, but it shows what the rate change cost you." },
  { name: "received_bdt", label: "Taka that reached your account", type: "number", step: "0.01", required: true },
  { name: "bank_charge_bdt", label: "Bank service charge, taka", type: "number", step: "0.01" },
  { name: "vat_bdt", label: "VAT, taka", type: "number", step: "0.01" },
  { name: "tax_withheld_bdt", label: "Tax held back at source, taka", type: "number", step: "0.01" },
  { name: "other_charge_bdt", label: "Any other charge, taka", type: "number", step: "0.01" },
  { name: "note", label: "Note (statement reference...)", wide: true },
];
const NEW = { source: "upwork", marketplace_fee_usd: "0", transfer_fee_usd: "0", bank_charge_bdt: "0", vat_bdt: "0", tax_withheld_bdt: "0", other_charge_bdt: "0" };

const ROWS: [keyof Waterfall, string, "start" | "cost" | "end"][] = [
  ["value_at_reference_rate", "Value of the dollars at your comparison rate", "start"],
  ["marketplace_fee", "Marketplace fee", "cost"],
  ["transfer_fee", "Withdrawal / cross-border fee", "cost"],
  ["rate_difference", "Rate difference (bank rate against yours)", "cost"],
  ["bank_charge", "Bank service charge", "cost"],
  ["vat", "VAT", "cost"],
  ["tax_withheld", "Tax held at source", "cost"],
  ["other", "Other charges", "cost"],
  ["received", "Reached your account", "end"],
];

function WaterfallTable({ w, covers, count }: { w: Waterfall; covers: number; count: number }) {
  const base = Number(w.value_at_reference_rate) || 1;
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[30rem] text-sm">
        <caption className="p-3 text-left text-xs text-muted">
          Where the money went, in taka{covers < count ? ` (the ${covers} payout${covers === 1 ? "" : "s"} with a comparison rate)` : ""}
        </caption>
        <tbody className="divide-y divide-line">
          {ROWS.map(([key, label, kind]) => {
            const v = Number(w[key]);
            const pct = (Math.abs(v) / base) * 100;
            return (
              <tr key={key} className={kind === "cost" ? "" : "font-semibold"}>
                <td className="p-3">
                  {kind === "cost" ? "− " : kind === "end" ? "= " : ""}
                  {label}
                  {kind === "cost" && (
                    <div className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-line" aria-hidden>
                      <div className={`h-full ${v < 0 ? "bg-brand" : "bg-red-400/70"}`} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  )}
                </td>
                <td className="p-3 text-right">{fmt("BDT", w[key])}</td>
                <td className="w-16 p-3 text-right font-mono text-xs text-muted">{pct.toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="p-3 text-xs text-muted">A negative rate difference is a gain: the bank paid more than your comparison rate.</p>
    </div>
  );
}

export default function ConversionsPanel({ start, end, onChange }: { start: string; end: string; onChange: () => void }) {
  const [report, setReport] = useState<ConversionReport>({});
  const [rows, setRows] = useState<SettlementRow[]>([]);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const q = new URLSearchParams(Object.entries({ from: start, to: end }).filter(([, v]) => v)).toString();
  const qs = q ? `?${q}` : "";

  useEffect(() => {
    api<ConversionReport>("GET", `/accounting/conversions/${qs}`).then((r) => r.ok && setReport(r.data ?? {}));
    api<SettlementRow[]>("GET", `/accounting/settlements/${qs}`).then((r) => (r.ok ? setRows(r.data ?? []) : setError(r.error)));
  }, [qs, tick]);

  const refresh = () => {
    setTick((t) => t + 1);
    onChange();
  };
  const usd = report.USD;

  return (
    <section aria-labelledby="conv" className="space-y-5">
      <div>
        <h2 id="conv" className="text-lg font-semibold">
          Dollars to taka
        </h2>
        <p className="mt-1 text-sm text-muted">
          Record each payout you bring home. The app works out the rate you really got and where each part of the money went.
        </p>
      </div>
      {error && <Alert>{error}</Alert>}

      {usd && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["Dollars earned", fmt("USD", usd.earned)],
                ["Fees taken in dollars", fmt("USD", String(Number(usd.marketplace_fees) + Number(usd.transfer_fees)))],
                ["Taka that reached you", fmt("BDT", usd.received_bdt)],
                ["Taka you keep per dollar earned", `৳${Number(usd.keep_per_dollar).toFixed(2)}`],
                ["Average rate you got (per dollar sold)", `৳${Number(usd.average_rate).toFixed(2)}`],
                ["Bank charges and VAT", fmt("BDT", String(Number(usd.bank_charges) + Number(usd.vat) + Number(usd.other_charges)))],
                ["Tax held at source", fmt("BDT", usd.tax_withheld)],
                ["Payouts recorded", String(usd.count)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line bg-surface p-4">
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-1 text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>
          {usd.waterfall ? (
            <WaterfallTable w={usd.waterfall} covers={usd.waterfall_covers} count={usd.count} />
          ) : (
            <p className="text-sm text-muted">Add a comparison rate to a payout to see where the money went.</p>
          )}
        </>
      )}

      {rows.length === 0 && <p className="text-sm text-muted">No payouts recorded in this period.</p>}
      <ul className="divide-y divide-line rounded-xl border border-line">
        {rows.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-medium">
                {fmt("USD", s.earned_usd)} → {fmt("BDT", s.received_bdt)}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted">
                {s.settled_on} · {SOURCES.find(([k]) => k === s.source)?.[1]} · rate got ৳{Number(s.effective_rate).toFixed(2)} · keep ৳
                {Number(s.keep_per_dollar).toFixed(2)} per dollar{s.note && ` · ${s.note}`}
              </p>
            </div>
            <button
              className={ghost}
              onClick={async () => {
                if (!window.confirm("Remove this payout from the books?")) return;
                const r = await api("DELETE", `/accounting/settlements/${s.id}/`);
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
        <h3 className="mb-3 font-semibold">Record a payout</h3>
        <Form
          key={rows.length}
          fields={FIELDS}
          initial={NEW}
          submitLabel="Add payout"
          onSave={async (payload) => {
            const r = await api("POST", "/accounting/settlements/", payload);
            if (r.ok) refresh();
            return r.ok ? "" : r.error;
          }}
        />
      </div>
    </section>
  );
}
