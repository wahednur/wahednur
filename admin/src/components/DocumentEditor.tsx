import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, field, Notice, useLoad } from "@/components/ui";
import { money } from "@/lib/format";
import { api } from "@/lib/http";
import type { Invoice, Project, Quotation } from "@/lib/types";

type Item = { description: string; quantity: string; unit_price: string };
type Step = { label: string; mode: "percent" | "amount"; value: string; due_date: string };

const blankItem = (): Item => ({ description: "", quantity: "1", unit_price: "" });
const PRESETS: { name: string; steps: Step[] }[] = [
  { name: "Full payment", steps: [{ label: "Full payment", mode: "percent", value: "100", due_date: "" }] },
  {
    name: "Start, middle, final (example split)",
    steps: [
      { label: "Start", mode: "percent", value: "40", due_date: "" },
      { label: "Middle", mode: "percent", value: "30", due_date: "" },
      { label: "Final", mode: "percent", value: "30", due_date: "" },
    ],
  },
];

/** Cents, for the on-screen preview only. The server works the real numbers out. */
const cents = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
const show = (c: number) => (c / 100).toFixed(2);

export function InstallmentsEditor({ steps, onChange, total, currency }: { steps: Step[]; onChange: (s: Step[]) => void; total: number; currency: string }) {
  const sum = steps.reduce((a, s) => a + (s.mode === "percent" ? Math.round((total * Number(s.value || 0)) / 100) : cents(s.value)), 0);
  const upd = (i: number, p: Partial<Step>) => onChange(steps.map((s, n) => (n === i ? { ...s, ...p } : s)));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button key={p.name} small type="button" onClick={() => onChange(p.steps)}>
            {p.name}
          </Button>
        ))}
      </div>
      {steps.map((s, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_6rem_6rem_9rem_auto]">
          <input aria-label="Label" placeholder="Label" value={s.label} onChange={(e) => upd(i, { label: e.target.value })} className={`${field} mt-0 col-span-2 sm:col-span-1`} />
          <select aria-label="Percent or amount" value={s.mode} onChange={(e) => upd(i, { mode: e.target.value as Step["mode"] })} className={`${field} mt-0`}>
            <option value="percent">Percent</option>
            <option value="amount">Amount</option>
          </select>
          <input aria-label="Value" inputMode="decimal" value={s.value} onChange={(e) => upd(i, { value: e.target.value })} className={`${field} mt-0`} />
          <input aria-label="Due date" type="date" value={s.due_date} onChange={(e) => upd(i, { due_date: e.target.value })} className={`${field} mt-0`} />
          <Button small type="button" tone="danger" onClick={() => onChange(steps.filter((_, n) => n !== i))} disabled={steps.length === 1}>
            Remove
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Button small type="button" onClick={() => onChange([...steps, { label: "", mode: "percent", value: "", due_date: "" }])}>Add installment</Button>
        <span className={sum === total ? "text-emerald-300" : "text-amber-200"}>
          Adds up to {money(currency, show(sum))} of {money(currency, show(total))}
          {sum !== total && " (percent splits are rounded by the server; fixed amounts must match exactly)"}
        </span>
      </div>
    </div>
  );
}
export type { Step };
export const stepsToApi = (steps: Step[]) =>
  steps.map((s) => ({
    label: s.label,
    ...(s.mode === "percent" ? { percent: s.value } : { amount: s.value }),
    ...(s.due_date ? { due_date: s.due_date } : {}),
  }));
export const presetSteps = () => PRESETS[0].steps;

/** Create or edit a draft quotation or invoice. */
export default function DocumentEditor({ kind, id }: { kind: "quotation" | "invoice"; id?: string }) {
  const nav = useNavigate();
  const projects = useLoad<Project[]>("/projects/");
  const existing = useLoad<Quotation | Invoice>(id ? `/${kind}s/${id}/` : "/auth/me/");
  const [project, setProject] = useState("");
  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState<"BDT" | "USD">("BDT");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [items, setItems] = useState<Item[]>([blankItem()]);
  const [steps, setSteps] = useState<Step[]>(presetSteps());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id || !existing.data) return;
    const d = existing.data as Invoice & Quotation;
    setProject(d.project);
    setTitle(d.title);
    setCurrency(d.currency);
    setDiscount(d.discount);
    setNotes(d.notes);
    setDate((kind === "quotation" ? d.valid_until : d.due_date) ?? "");
    setItems(d.items.map((i) => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })));
    if (kind === "invoice" && d.installments?.length) {
      setSteps(d.installments.map((s) => ({ label: s.label, mode: "amount" as const, value: s.amount, due_date: s.due_date ?? "" })));
    }
  }, [id, existing.data, kind]);

  const gross = items.reduce((a, i) => a + Math.round(cents(i.unit_price) * Number(i.quantity || 0)), 0);
  const total = Math.max(0, gross - cents(discount));
  const upd = (n: number, p: Partial<Item>) => setItems(items.map((it, i) => (i === n ? { ...it, ...p } : it)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const body = {
      ...(id ? {} : { project }),
      title,
      currency,
      discount: discount || "0",
      notes,
      items: items.map((i) => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })),
      ...(kind === "quotation" ? { valid_until: date || null } : { due_date: date || null, installments: stepsToApi(steps) }),
    };
    const r = await api<{ id: string }>(id ? "PUT" : "POST", id ? `/${kind}s/${id}/` : `/${kind}s/`, body);
    setBusy(false);
    if (!r.ok || !r.data) return setError(r.error);
    nav(kind === "quotation" ? `/billing/quotations/${r.data.id}` : `/billing/invoices/${r.data.id}`);
  }

  if (id && existing.error) return <Notice>{existing.error}</Notice>;

  return (
    <form onSubmit={save} className="space-y-5">
      {error && <Notice>{error}</Notice>}
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <label className="text-sm">
          Project
          <select required disabled={!!id} value={project} onChange={(e) => setProject(e.target.value)} className={field}>
            <option value="">Choose…</option>
            {(projects.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.title} ({p.client_email})</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Title
          <input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
        </label>
        <label className="text-sm">
          Currency (one per document)
          <select value={currency} onChange={(e) => setCurrency(e.target.value as "BDT" | "USD")} className={field}>
            <option value="BDT">BDT (taka)</option>
            <option value="USD">USD (dollars)</option>
          </select>
        </label>
        <label className="text-sm">
          {kind === "quotation" ? "Valid until (optional)" : "Due date (optional)"}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        </label>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold">Work and prices</h2>
        <div className="space-y-2">
          {items.map((it, n) => (
            <div key={n} className="grid grid-cols-[1fr_5rem_8rem_auto] gap-2">
              <input aria-label="Description" placeholder="What is being built" required maxLength={300} value={it.description} onChange={(e) => upd(n, { description: e.target.value })} className={`${field} mt-0`} />
              <input aria-label="Quantity" inputMode="decimal" required value={it.quantity} onChange={(e) => upd(n, { quantity: e.target.value })} className={`${field} mt-0`} />
              <input aria-label="Unit price" placeholder="Price" inputMode="decimal" required value={it.unit_price} onChange={(e) => upd(n, { unit_price: e.target.value })} className={`${field} mt-0`} />
              <Button small type="button" tone="danger" disabled={items.length === 1} onClick={() => setItems(items.filter((_, i) => i !== n))}>×</Button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Button small type="button" onClick={() => setItems([...items, blankItem()])}>Add line</Button>
          <label className="flex items-center gap-2 text-sm">
            Discount
            <input inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} className={`${field} mt-0 w-28`} />
          </label>
        </div>
        <p className="mt-4 text-right text-lg font-semibold">Total {money(currency, show(total))}</p>
        <p className="text-right text-xs text-muted">The server works out the final total again when you save.</p>
      </Card>

      {kind === "invoice" && (
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Payment plan</h2>
          <InstallmentsEditor steps={steps} onChange={setSteps} total={total} currency={currency} />
        </Card>
      )}

      <Card className="p-5">
        <label className="text-sm">
          Terms and notes shown to the client (optional)
          <textarea rows={4} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} className={field} />
        </label>
      </Card>

      <div className="flex gap-3">
        <Button tone="brand" type="submit" disabled={busy}>{busy ? "Saving…" : id ? "Save draft" : "Create draft"}</Button>
        <Button type="button" onClick={() => nav("/billing")}>Cancel</Button>
      </div>
    </form>
  );
}
