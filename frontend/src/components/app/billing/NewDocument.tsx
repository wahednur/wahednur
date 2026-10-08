"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/auth/ui";
import { api, PLANS, type Project } from "@/lib/api";
import { btn, field } from "./Bits";

type Row = { description: string; quantity: string; unit_price: string; cycle: string };
const blank = (): Row => ({ description: "", quantity: "1", unit_price: "", cycle: "one_time" });

/** Staff form for a new quotation or invoice. The server recalculates every total. */
export default function NewDocument({ kind, onDone }: { kind: "quotations" | "invoices"; onDone: () => void }) {
  const quote = kind === "quotations";
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  // A local client is billed in taka and a foreign client in dollars; the server checks it too.
  const currency = projects.find((p) => p.id === projectId)?.client_currency ?? "BDT";
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Project[]>("GET", "/projects/").then((r) => r.ok && setProjects(r.data ?? []));
  }, []);

  const set = (i: number, patch: Partial<Row>) => setRows((all) => all.map((r, n) => (n === i ? { ...r, ...patch } : r)));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const body: Record<string, unknown> = {
      project: f.get("project"),
      title: f.get("title"),
      currency: f.get("currency"),
      discount: f.get("discount") || "0",
      notes: f.get("notes"),
      items: rows,
    };
    if (quote && f.get("valid_until")) body.valid_until = f.get("valid_until");
    if (!quote) {
      if (f.get("due_date")) body.due_date = f.get("due_date");
      body.installments = PLANS[String(f.get("plan"))].steps;
    }
    setBusy(true);
    setError("");
    const r = await api("POST", `/${kind}/`, body);
    setBusy(false);
    if (r.ok) {
      form.reset();
      setProjectId("");
      setRows([blank()]);
      onDone();
    } else setError(r.error);
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-line bg-surface p-5 text-sm">
      <h2 className="font-semibold">{quote ? "New quotation" : "New invoice (without a quotation)"}</h2>
      {error && <Alert>{error}</Alert>}
      <label className="block">
        Project
        <select name="project" required value={projectId} onChange={(e) => setProjectId(e.target.value)} className={field}>
          <option value="" disabled>
            Choose a project
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} — {p.client_email}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="sm:col-span-2">
          Title
          <input name="title" required maxLength={200} className={field} />
        </label>
        <label>
          Currency
          <input name="currency" value={currency} readOnly className={field} aria-describedby="cur-note" />
          <span id="cur-note" className="mt-1 block text-xs text-muted">
            {currency === "USD" ? "Foreign client" : "Local client"}
          </span>
        </label>
      </div>
      <fieldset className="space-y-2">
        <legend className="font-medium">Items</legend>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <input aria-label="Description" placeholder="Description" required value={r.description} maxLength={300}
              onChange={(e) => set(i, { description: e.target.value })} className={`${field} col-span-12 sm:col-span-5 !mt-0`} />
            <input aria-label="Quantity" type="number" min="0.01" step="0.01" required value={r.quantity}
              onChange={(e) => set(i, { quantity: e.target.value })} className={`${field} col-span-4 sm:col-span-2 !mt-0`} />
            <input aria-label="Unit price" type="number" min="0" step="0.01" required placeholder="Price" value={r.unit_price}
              onChange={(e) => set(i, { unit_price: e.target.value })} className={`${field} col-span-5 sm:col-span-3 !mt-0`} />
            <select aria-label="Billing cycle" value={r.cycle} onChange={(e) => set(i, { cycle: e.target.value })}
              className={`${field} col-span-3 sm:col-span-2 !mt-0`}>
              <option value="one_time">Once</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        ))}
        <div className="flex gap-3">
          <button type="button" className="text-brand hover:underline" onClick={() => setRows((a) => [...a, blank()])}>
            + Add item
          </button>
          {rows.length > 1 && (
            <button type="button" className="text-muted hover:text-red-400" onClick={() => setRows((a) => a.slice(0, -1))}>
              Remove last
            </button>
          )}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          Discount (amount)
          <input name="discount" type="number" min="0" step="0.01" defaultValue="0" className={field} />
        </label>
        {quote ? (
          <label>
            Valid until
            <input name="valid_until" type="date" className={field} />
          </label>
        ) : (
          <label>
            Due date
            <input name="due_date" type="date" className={field} />
          </label>
        )}
      </div>
      {!quote && (
        <label className="block">
          Payment plan
          <select name="plan" defaultValue="full" className={field}>
            {Object.entries(PLANS).map(([k, p]) => (
              <option key={k} value={k}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block">
        Notes for the client (terms)
        <textarea name="notes" rows={2} maxLength={2000} className={field} />
      </label>
      <button disabled={busy} className={btn}>
        {busy ? "Saving…" : "Save as draft"}
      </button>
    </form>
  );
}
