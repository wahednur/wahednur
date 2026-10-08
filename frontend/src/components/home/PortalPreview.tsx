"use client";

import { useState } from "react";

const TABS = ["Quote", "Progress", "Invoice", "Files"] as const;
type Tab = (typeof TABS)[number];

/** What a client sees after signing in. Sample data only, and it says so. */
export default function PortalPreview() {
  const [tab, setTab] = useState<Tab>("Progress");
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-black/40">
      <div className="flex items-center gap-1.5 border-b border-line bg-surface-2 px-4 py-2.5" aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-line" /><span className="h-2.5 w-2.5 rounded-full bg-line" /><span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="ml-3 font-mono text-[11px] text-muted">wahednur.tech / client area</span>
        <span className="ml-auto rounded-full border border-amber-400/40 px-2 py-0.5 font-mono text-[10px] text-amber-200">sample data</span>
      </div>
      <div role="tablist" aria-label="Client area sections" className="flex gap-1 border-b border-line px-3 pt-3">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-t-lg px-4 py-2 text-sm transition-colors ${tab === t ? "bg-bg font-medium text-brand" : "text-muted hover:text-ink"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="min-h-[300px] bg-bg p-5 sm:p-6" role="tabpanel" key={tab}>
        <div className="animate-[fade_0.35s_ease]">
          {tab === "Quote" && <Quote />}
          {tab === "Progress" && <Progress />}
          {tab === "Invoice" && <Invoice />}
          {tab === "Files" && <Files />}
        </div>
      </div>
      <style>{"@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}"}</style>
    </div>
  );
}

const Row = ({ a, b, c }: { a: string; b?: string; c: string }) => (
  <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-sm last:border-0">
    <span>{a}{b && <span className="block font-mono text-[11px] text-muted">{b}</span>}</span>
    <span className="shrink-0 font-mono text-xs">{c}</span>
  </div>
);

function Quote() {
  return (
    <div>
      <div className="flex items-center justify-between"><p className="font-semibold">Online store build</p><span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[11px] text-muted">delivered</span></div>
      <p className="mt-1 font-mono text-[11px] text-muted">QUO-0001 · Rev A</p>
      <div className="mt-3">
        <Row a="Sheet 01: Storefront and checkout" b="time 10–14 days · risk medium" c="$——" />
        <Row a="Sheet 02: Admin panel" b="time 7–10 days · risk low" c="$——" />
        <Row a="Sheet 03: Deployment" b="time 2–3 days · risk medium" c="$——" />
      </div>
      <div className="mt-4 flex gap-2"><span className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-bg">Accept</span><span className="rounded-md border border-line px-4 py-2 text-sm text-muted">Print or save as PDF</span></div>
    </div>
  );
}

function Progress() {
  const rows: [string, number, string][] = [["Design approved", 100, "done"], ["First working version", 60, "in progress"], ["Final delivery", 0, "to do"]];
  return (
    <div>
      <div className="flex items-center justify-between"><p className="font-semibold">Overall progress</p><p className="font-mono text-sm text-brand">33%</p></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-line"><div className="h-full w-1/3 rounded-full bg-brand transition-all duration-700" /></div>
      <p className="mt-1 text-xs text-muted">Worked out from finished milestones. It is never typed in by hand.</p>
      <ul className="mt-4 space-y-3">
        {rows.map(([t, pct, s]) => (
          <li key={t} className="text-sm">
            <div className="flex justify-between"><span>{t}</span><span className="font-mono text-xs text-muted">{s}</span></div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand/70" style={{ width: `${pct}%` }} /></div>
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-lg border border-line bg-surface p-3 text-xs text-muted"><span className="text-ink">Update:</span> The first version of the checkout is ready to test on the staging link.</p>
    </div>
  );
}

function Invoice() {
  return (
    <div>
      <div className="flex items-center justify-between"><p className="font-semibold">Invoice</p><span className="rounded-full border border-amber-400/40 px-2.5 py-0.5 font-mono text-[11px] text-amber-200">partly paid</span></div>
      <div className="mt-3">
        <Row a="Advance (before work starts)" b="40%" c="paid" />
        <Row a="Midway delivery" b="30%" c="due" />
        <Row a="Final delivery" b="30%" c="later" />
      </div>
      <p className="mt-4 text-xs text-muted">Final delivery follows full payment. Every payment is recorded, so what is still due is always visible.</p>
    </div>
  );
}

function Files() {
  return (
    <div>
      <p className="font-semibold">Private files</p>
      <div className="mt-3">
        <Row a="Project agreement.pdf" b="shared with you" c="download" />
        <Row a="Terms of reference.pdf" b="shared with you" c="download" />
        <Row a="Receipt, first payment.pdf" b="shared with you" c="download" />
      </div>
      <p className="mt-4 text-xs text-muted">Files are stored privately. Each download uses a link that expires in minutes, and only you can open yours.</p>
    </div>
  );
}
