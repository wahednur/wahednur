import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ClientPicker from "@/components/ClientPicker";
import { Button, Card, field, Notice, useLoad } from "@/components/ui";
import { money } from "@/lib/format";
import { api } from "@/lib/http";
import type { ClientRow, Invoice, Project, Quotation, RecurringInv, TaxRate } from "@/lib/types";

type Item = {
  description: string;
  quantity: string;
  unit_price: string;
  unit_price_max: string;
  details: string;
  time_estimate: string;
  risk: string;
  work_state: string;
  note: string;
  counted: boolean;
};
type Section = { heading: string; body: string };
type RiskRow = { risk: string; impact: string };
type PlanRow = { label: string; percent: string; note: string };
type Step = { label: string; mode: "percent" | "amount"; value: string; due_date: string };

const blankItem = (): Item => ({
  description: "",
  quantity: "1",
  unit_price: "",
  unit_price_max: "",
  details: "",
  time_estimate: "",
  risk: "",
  work_state: "",
  note: "",
  counted: true,
});
const STANDARD_PLAN: PlanRow[] = [
  { label: "Advance (before work starts)", percent: "40", note: "At signing" },
  { label: "Midway delivery", percent: "30", note: "" },
  { label: "Final delivery", percent: "30", note: "Final delivery follows full payment" },
];
export const STANDARD_NOTE =
  "Payment: 40% advance before work starts, 30% midway, and the final 30% before final delivery. " +
  "Final delivery follows full payment.";
const PRESETS: { name: string; steps: Step[] }[] = [
  {
    name: "Standard: 40% advance, 30% midway, 30% final",
    steps: [
      { label: "Advance (before work starts)", mode: "percent", value: "40", due_date: "" },
      { label: "Midway", mode: "percent", value: "30", due_date: "" },
      { label: "Final (before final delivery)", mode: "percent", value: "30", due_date: "" },
    ],
  },
  { name: "Full payment", steps: [{ label: "Full payment", mode: "percent", value: "100", due_date: "" }] },
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


type Kind = "quotation" | "invoice" | "recurring";
const TITLES: Record<Kind, [string, string]> = {
  quotation: ["New quote / proposal / estimate", "Edit quote"],
  invoice: ["New invoice", "Edit invoice"],
  recurring: ["New recurring invoice", "Edit recurring invoice"],
};
const DEFAULT_PREFIX: Record<Kind, string> = { quotation: "QUO", invoice: "INV", recurring: "INV" };
const label = "block text-sm";
const sectionTitle = "mb-4 text-xs font-semibold uppercase tracking-wide text-muted";

/** The exact half-up rounding the server uses, done on whole cents so the preview matches the saved total. */
const pct = (base: number, rate: number) => Math.round((base * rate) / 100 + Number.EPSILON);

/** One form for a quote, an invoice or a recurring invoice. The server works out every total again. */
export default function DocumentEditor({ kind, id }: { kind: Kind; id?: string }) {
  const nav = useNavigate();
  const clients = useLoad<ClientRow[]>("/clients/");
  const projects = useLoad<Project[]>("/projects/");
  const taxes = useLoad<TaxRate[]>("/billing/taxes/");
  const path = kind === "recurring" ? "/billing/recurring" : `/${kind}s`;
  const existing = useLoad<Quotation & Invoice & RecurringInv>(id ? `${path}/${id}/` : "");

  const [clientId, setClientId] = useState<number | null>(null);
  const [project, setProject] = useState("");
  const [address, setAddress] = useState("");
  const [title, setTitle] = useState("");
  const [prefix, setPrefix] = useState(DEFAULT_PREFIX[kind]);
  const [number, setNumber] = useState("");
  const [nextNumber, setNextNumber] = useState("");
  const [issued, setIssued] = useState(new Date().toISOString().slice(0, 10));
  const [date, setDate] = useState(""); // expiry (quote) or due date (invoice)
  const [status, setStatus] = useState<"draft" | "sent">("draft");
  const [proposal, setProposal] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [revision, setRevision] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [risks, setRisks] = useState<RiskRow[]>([]);
  const [plan, setPlan] = useState<PlanRow[]>(STANDARD_PLAN);
  const [items, setItems] = useState<Item[]>([blankItem()]);
  const [taxId, setTaxId] = useState("");
  const [discountMode, setDiscountMode] = useState<"amount" | "percent">("amount");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState(id ? "" : STANDARD_NOTE);
  const [steps, setSteps] = useState<Step[]>(presetSteps());
  const [frequency, setFrequency] = useState("monthly");
  const [endDate, setEndDate] = useState("");
  const [dueDays, setDueDays] = useState("15");
  const [autoIssue, setAutoIssue] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const sheets = kind !== "recurring";
  const chosen = (clients.data ?? []).find((c) => c.id === clientId) ?? null;
  const currency = chosen?.currency ?? "BDT";
  const clientProjects = (projects.data ?? []).filter((p) => p.client === clientId);
  const tax = (taxes.data ?? []).find((t) => String(t.id) === taxId) ?? null;

  // Load an existing document into the form.
  useEffect(() => {
    if (!id || !existing.data) return;
    const d = existing.data;
    setClientId(d.client);
    setProject(d.project);
    setAddress(d.bill_to_address);
    setTitle(d.title);
    setPrefix(kind === "recurring" ? d.prefix : d.number_prefix || DEFAULT_PREFIX[kind]);
    setNumber(kind === "recurring" ? "" : d.number);
    setIssued(kind === "recurring" ? d.start_date : d.issue_date);
    setDate((kind === "quotation" ? d.valid_until : kind === "invoice" ? d.due_date : d.end_date) ?? "");
    setProposal(d.proposal_text ?? "");
    setSubtitle(d.subtitle ?? "");
    setRevision(d.revision ?? "");
    setSections(d.sections ?? []);
    setRisks(d.risks ?? []);
    if (kind === "quotation") setPlan(d.payment_plan?.length ? d.payment_plan : []);
    setItems(
      d.items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        unit_price_max: i.unit_price_max ?? "",
        details: i.details ?? "",
        time_estimate: i.time_estimate ?? "",
        risk: i.risk ?? "",
        work_state: i.work_state ?? "",
        note: i.note ?? "",
        counted: i.counted ?? true,
      })),
    );
    setDiscount(d.discount);
    setNotes(d.notes);
    if (kind === "invoice" && d.installments?.length)
      setSteps(d.installments.map((s) => ({ label: s.label, mode: "amount" as const, value: s.amount, due_date: s.due_date ?? "" })));
    if (kind === "recurring") {
      setFrequency(d.frequency);
      setEndDate(d.end_date ?? "");
      setDueDays(String(d.due_days));
      setAutoIssue(d.auto_issue);
    }
  }, [id, existing.data, kind]);

  // Match the saved tax to a rate in the list (by name and rate) once both are loaded.
  useEffect(() => {
    if (!id || !existing.data || !taxes.data) return;
    const d = existing.data;
    const m = taxes.data.find((t) => t.name === d.tax_name && Number(t.rate) === Number(d.tax_rate));
    setTaxId(m ? String(m.id) : "");
  }, [id, existing.data, taxes.data]);

  // A new document starts from the chosen client's address; the next number is shown as a hint.
  function pick(c: ClientRow | null) {
    setClientId(c?.id ?? null);
    setProject("");
    if (c && !id) setAddress([c.company || c.full_name, c.address].filter(Boolean).join("\n"));
  }
  useEffect(() => {
    if (kind === "recurring" || id) return;
    const handle = setTimeout(() => {
      api<{ number: string }>("GET", `/billing/next-number/?prefix=${encodeURIComponent(prefix)}`).then((r) => r.ok && r.data && setNextNumber(r.data.number));
    }, 250);
    return () => clearTimeout(handle);
  }, [prefix, kind, id]);

  const totals = useMemo(() => {
    const line = (i: Item, top = false) =>
      Math.round(cents(top && i.unit_price_max ? i.unit_price_max : i.unit_price) * Number(i.quantity || 0) + Number.EPSILON);
    const gross = items.reduce((a, i) => (i.counted ? a + line(i) : a), 0);
    const grossMax = items.some((i) => i.counted && i.unit_price_max) ? items.reduce((a, i) => (i.counted ? a + line(i, true) : a), 0) : null;
    const disc = discountMode === "percent" ? pct(gross, Number(discount || 0)) : cents(discount);
    const base = Math.max(0, gross - disc);
    const taxAmount = tax ? pct(base, Number(tax.rate)) : 0;
    return { gross, grossMax, disc, base, taxAmount, total: base + taxAmount };
  }, [items, discount, discountMode, tax]);

  const upd = (n: number, p: Partial<Item>) => setItems(items.map((it, i) => (i === n ? { ...it, ...p } : it)));

  async function save(after?: "send" | "issue") {
    if (!clientId && !id) return setError("Choose a customer first.");
    setBusy(true);
    setError("");
    const common = {
      title,
      currency,
      discount: show(totals.disc),
      notes,
      bill_to_address: address,
      tax_name: tax?.name ?? "",
      tax_rate: tax?.rate ?? "0",
      items: items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        ...(kind === "recurring"
          ? {}
          : {
              unit_price_max: i.unit_price_max || null,
              details: i.details,
              time_estimate: i.time_estimate,
              risk: i.risk,
              work_state: i.work_state,
              note: i.note,
              counted: i.counted,
            }),
      })),
    };
    const create = id ? {} : { client: clientId, ...(project ? { project } : {}) };
    const body =
      kind === "quotation"
        ? {
            ...common,
            ...create,
            prefix,
            number,
            issue_date: issued,
            valid_until: date || null,
            proposal_text: proposal,
            subtitle,
            revision,
            sections: sections.filter((x) => x.heading.trim()),
            risks: risks.filter((x) => x.risk.trim()),
            payment_plan: plan.filter((x) => x.label.trim()).map((x) => ({ ...x, percent: x.percent || "0" })),
          }
        : kind === "invoice"
          ? { ...common, ...create, prefix, number, issue_date: issued, due_date: date || null, subtitle, revision, installments: stepsToApi(steps) }
          : { ...common, ...create, prefix, frequency, start_date: issued, end_date: endDate || null, due_days: Number(dueDays || 0), auto_issue: autoIssue };
    const r = await api<{ id: string }>(id ? "PUT" : "POST", id ? `${path}/${id}/` : `${path}/`, body);
    if (!r.ok || !r.data) {
      setBusy(false);
      return setError(r.error);
    }
    const newId = r.data.id;
    if (after) {
      const a = await api("POST", `${path}/${newId}/${after === "send" ? "send" : "issue"}/`, {});
      if (!a.ok) {
        setBusy(false);
        return setError(`Saved as a draft, but it could not be ${after === "send" ? "delivered" : "issued"}: ${a.error}`);
      }
    }
    setBusy(false);
    nav(kind === "quotation" ? `/billing/quotations/${newId}` : kind === "invoice" ? `/billing/invoices/${newId}` : `/billing/recurring/${newId}`);
  }

  if (id && existing.error) return <Notice>{existing.error}</Notice>;
  const sym = currency === "USD" ? "USD ($)" : "BDT (৳)";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="grid gap-6 lg:grid-cols-[1fr_20rem]"
    >
      <div className="space-y-6">
        {error && <Notice>{error}</Notice>}

        <Card className="p-5">
          <h2 className={sectionTitle}>Customer</h2>
          <div className="space-y-4">
            <div className={label}>
              Customer
              <div className="mt-1">
                <ClientPicker clients={clients.data ?? []} value={clientId} onChange={pick} onCreated={clients.reload} disabled={!!id} />
              </div>
            </div>
            {chosen && (
              <p className="rounded-lg border border-line bg-bg/40 px-3 py-2 text-xs text-muted">
                {chosen.client_type === "foreign" ? "Foreign client" : "Local client"}: this document is billed in <b className="text-ink">{sym}</b>.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={label}>
                Address (shown on the document)
                <textarea rows={3} maxLength={500} value={address} onChange={(e) => setAddress(e.target.value)} className={field} />
              </label>
              <label className={label}>
                Project (optional)
                <select disabled={!!id || !clientId} value={project} onChange={(e) => setProject(e.target.value)} className={field}>
                  <option value="">General billing (no project)</option>
                  {clientProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className={sectionTitle}>Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={`${label} sm:col-span-2`}>
              {kind === "quotation" ? "Subject" : "Title"}
              <input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
            </label>
            {kind !== "recurring" && (
              <>
                <label className={`${label} sm:col-span-2`}>
                  Subtitle <span className="text-muted">(optional)</span>
                  <input maxLength={300} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={field} />
                </label>
                <label className={label}>
                  Revision <span className="text-muted">(for example Rev A)</span>
                  <input maxLength={20} value={revision} onChange={(e) => setRevision(e.target.value)} className={field} />
                </label>
                <span />
                <label className={label}>
                  {kind === "quotation" ? "Quote" : "Invoice"} prefix
                  <input maxLength={8} value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} className={`${field} font-mono`} />
                </label>
                <label className={label}>
                  {kind === "quotation" ? "Quote" : "Invoice"} number
                  <input maxLength={30} value={number} placeholder={id ? "" : nextNumber || "Automatic"} onChange={(e) => setNumber(e.target.value.toUpperCase())} className={`${field} font-mono`} />
                  <span className="mt-1 block text-xs text-muted">{id ? "Change it only if you must." : "Leave empty to use the next number."}</span>
                </label>
              </>
            )}
            <label className={label}>
              {kind === "recurring" ? "First invoice date" : "Date created"}
              <input type="date" required value={issued} onChange={(e) => setIssued(e.target.value)} className={field} />
            </label>
            {kind === "quotation" && (
              <label className={label}>
                Expiry date
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
              </label>
            )}
            {kind === "invoice" && (
              <label className={label}>
                Due date
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
              </label>
            )}
            {kind === "quotation" && !id && (
              <label className={label}>
                Status
                <select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "sent")} className={field}>
                  <option value="draft">Draft</option>
                  <option value="sent">Delivered (email it to the client)</option>
                </select>
                <span className="mt-1 block text-xs text-muted">Accepted, Lost and Dead are set later, from the quote.</span>
              </label>
            )}
            {kind === "recurring" && (
              <>
                <label className={label}>
                  Repeats
                  <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={field}>
                    <option value="weekly">Every week</option>
                    <option value="monthly">Every month</option>
                    <option value="quarterly">Every 3 months</option>
                    <option value="yearly">Every year</option>
                  </select>
                </label>
                <label className={label}>
                  Stop after (optional)
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={field} />
                </label>
                <label className={label}>
                  Payment due after (days)
                  <input type="number" min={0} max={365} value={dueDays} onChange={(e) => setDueDays(e.target.value)} className={field} />
                </label>
                <label className="flex items-start gap-3 rounded-lg border border-line p-3 text-sm sm:col-span-2">
                  <input type="checkbox" checked={autoIssue} onChange={(e) => setAutoIssue(e.target.checked)} className="mt-1" />
                  <span>
                    Issue and email each invoice automatically
                    <span className="block text-xs text-muted">Off: every invoice waits as a draft for you to check and issue.</span>
                  </span>
                </label>
              </>
            )}
          </div>
          {kind === "quotation" && (
            <label className={`${label} mt-4`}>
              Proposal text
              <textarea rows={6} maxLength={5000} value={proposal} onChange={(e) => setProposal(e.target.value)} placeholder="What you will build, how, and why. Shown on the quote." className={field} />
            </label>
          )}
        </Card>

        <Card className="p-5">
          <h2 className={sectionTitle}>Items</h2>
          <div className="hidden grid-cols-[1fr_5rem_8rem_8rem_2.5rem] gap-2 px-1 pb-1 text-xs text-muted sm:grid">
            <span>{sheets ? "Part of the work" : "Description"}</span><span>Qty</span><span>Price</span><span className="text-right">Amount</span><span />
          </div>
          <div className="space-y-3">
            {items.map((it, n) => (
              <div key={n} className={`rounded-xl border border-line bg-bg/30 p-3 ${it.counted ? "" : "opacity-80"}`}>
                <div className="grid grid-cols-[1fr_4.5rem] items-center gap-2 sm:grid-cols-[1fr_5rem_8rem_8rem_2.5rem]">
                  <input aria-label="Description" placeholder="Item or service" required maxLength={300} value={it.description} onChange={(e) => upd(n, { description: e.target.value })} className={`${field} mt-0`} />
                  <input aria-label="Quantity" inputMode="decimal" required value={it.quantity} onChange={(e) => upd(n, { quantity: e.target.value })} className={`${field} mt-0`} />
                  <input aria-label="Unit price" placeholder="0.00" inputMode="decimal" required value={it.unit_price} onChange={(e) => upd(n, { unit_price: e.target.value })} className={`${field} mt-0`} />
                  <p className="text-right text-sm tabular-nums">{it.counted ? money(currency, show(Math.round(cents(it.unit_price) * Number(it.quantity || 0)))) : "Included"}</p>
                  <Button small type="button" tone="danger" aria-label="Remove line" disabled={items.length === 1} onClick={() => setItems(items.filter((_, i) => i !== n))}>×</Button>
                </div>
                {sheets && (
                  <details className="mt-2" open={!!(it.details || it.time_estimate || it.risk || it.work_state || it.note || it.unit_price_max || !it.counted)}>
                    <summary className="cursor-pointer text-xs text-brand">Details, time, risk and price range</summary>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className={`${label} sm:col-span-2`}>
                        What it covers (one point per line)
                        <textarea aria-label="Details" rows={4} maxLength={2000} value={it.details} onChange={(e) => upd(n, { details: e.target.value })} className={field} />
                      </label>
                      <label className={label}>Time needed<input aria-label="Time needed" maxLength={60} placeholder="for example 7–10 days" value={it.time_estimate} onChange={(e) => upd(n, { time_estimate: e.target.value })} className={field} /></label>
                      <label className={label}>Top of the price range (optional)<input aria-label="Price range top" inputMode="decimal" placeholder="blank: a fixed price" value={it.unit_price_max} onChange={(e) => upd(n, { unit_price_max: e.target.value })} className={field} /></label>
                      <label className={label}>Risk
                        <select aria-label="Risk" value={it.risk} onChange={(e) => upd(n, { risk: e.target.value })} className={field}>
                          <option value="">Not stated</option><option value="low">Low</option><option value="mid">Medium</option><option value="high">High</option>
                        </select>
                      </label>
                      <label className={label}>Where the work stands
                        <select aria-label="Work state" value={it.work_state} onChange={(e) => upd(n, { work_state: e.target.value })} className={field}>
                          <option value="">Not stated</option><option value="new">To do</option><option value="partial">Partly done</option><option value="done">Done</option>
                        </select>
                      </label>
                      <label className={`${label} sm:col-span-2`}>Note under this part<input aria-label="Note" maxLength={300} value={it.note} onChange={(e) => upd(n, { note: e.target.value })} className={field} /></label>
                      <label className="flex items-start gap-2 text-sm sm:col-span-2">
                        <input aria-label="Not counted" type="checkbox" checked={!it.counted} onChange={(e) => upd(n, { counted: !e.target.checked })} className="mt-1" />
                        <span>Show it, but do not add it to the total <span className="block text-xs text-muted">For work already done as a free proof.</span></span>
                      </label>
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3"><Button small type="button" onClick={() => setItems([...items, blankItem()])}>+ Add item</Button></div>
        </Card>

        {kind === "quotation" && (
          <>
            <Card className="p-5">
              <h2 className={sectionTitle}>Payment milestones</h2>
              <p className="mb-3 text-xs text-muted">Shown on the quote. When the quote becomes an invoice these become its installments. They must add up to 100%.</p>
              <div className="space-y-2">
                {plan.map((p, n) => (
                  <div key={n} className="grid grid-cols-[1fr_5rem_auto] items-center gap-2 sm:grid-cols-[1fr_5rem_1.2fr_auto]">
                    <input aria-label="Milestone" placeholder="Milestone" maxLength={80} value={p.label} onChange={(e) => setPlan(plan.map((x, i) => (i === n ? { ...x, label: e.target.value } : x)))} className={`${field} mt-0`} />
                    <input aria-label="Milestone percent" inputMode="decimal" placeholder="%" value={p.percent} onChange={(e) => setPlan(plan.map((x, i) => (i === n ? { ...x, percent: e.target.value } : x)))} className={`${field} mt-0`} />
                    <input aria-label="Milestone note" placeholder="When it is due" maxLength={200} value={p.note} onChange={(e) => setPlan(plan.map((x, i) => (i === n ? { ...x, note: e.target.value } : x)))} className={`${field} mt-0 hidden sm:block`} />
                    <Button small type="button" tone="danger" aria-label="Remove milestone" onClick={() => setPlan(plan.filter((_, i) => i !== n))}>×</Button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="flex gap-2">
                  <Button small type="button" onClick={() => setPlan([...plan, { label: "", percent: "", note: "" }])}>+ Add milestone</Button>
                  <Button small type="button" onClick={() => setPlan(STANDARD_PLAN)}>Use 40 / 30 / 30</Button>
                </div>
                {plan.length > 0 && (
                  <span className={plan.reduce((a, p) => a + Number(p.percent || 0), 0) === 100 ? "text-emerald-300" : "text-amber-200"}>
                    Adds up to {plan.reduce((a, p) => a + Number(p.percent || 0), 0)}%
                  </span>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className={sectionTitle}>Risks</h2>
              <div className="space-y-2">
                {risks.map((r, n) => (
                  <div key={n} className="grid grid-cols-[1fr_auto] items-start gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
                    <input aria-label="Risk" placeholder="What could go wrong" maxLength={160} value={r.risk} onChange={(e) => setRisks(risks.map((x, i) => (i === n ? { ...x, risk: e.target.value } : x)))} className={`${field} mt-0`} />
                    <input aria-label="Impact" placeholder="What it would cause" maxLength={400} value={r.impact} onChange={(e) => setRisks(risks.map((x, i) => (i === n ? { ...x, impact: e.target.value } : x)))} className={`${field} mt-0 hidden sm:block`} />
                    <Button small type="button" tone="danger" aria-label="Remove risk" onClick={() => setRisks(risks.filter((_, i) => i !== n))}>×</Button>
                  </div>
                ))}
              </div>
              <div className="mt-3"><Button small type="button" onClick={() => setRisks([...risks, { risk: "", impact: "" }])}>+ Add risk</Button></div>
            </Card>

            <Card className="p-5">
              <h2 className={sectionTitle}>Extra sections</h2>
              <p className="mb-3 text-xs text-muted">Anything else the proposal should explain: architecture, dependencies, what is already done.</p>
              <div className="space-y-3">
                {sections.map((sec, n) => (
                  <div key={n} className="rounded-xl border border-line bg-bg/30 p-3">
                    <div className="flex gap-2">
                      <input aria-label="Section heading" placeholder="Heading" maxLength={120} value={sec.heading} onChange={(e) => setSections(sections.map((x, i) => (i === n ? { ...x, heading: e.target.value } : x)))} className={`${field} mt-0`} />
                      <Button small type="button" tone="danger" aria-label="Remove section" onClick={() => setSections(sections.filter((_, i) => i !== n))}>×</Button>
                    </div>
                    <textarea aria-label="Section text" rows={4} maxLength={3000} value={sec.body} onChange={(e) => setSections(sections.map((x, i) => (i === n ? { ...x, body: e.target.value } : x)))} className={field} />
                  </div>
                ))}
              </div>
              <div className="mt-3"><Button small type="button" onClick={() => setSections([...sections, { heading: "", body: "" }])}>+ Add section</Button></div>
            </Card>
          </>
        )}

        {kind === "invoice" && (
          <Card className="p-5">
            <h2 className={sectionTitle}>Payment plan</h2>
            <InstallmentsEditor steps={steps} onChange={setSteps} total={totals.total} currency={currency} />
          </Card>
        )}

        <Card className="p-5">
          <label className={label}>
            Terms and notes shown to the client <span className="text-muted">(optional)</span>
            <textarea rows={4} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} className={field} />
          </label>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <Card className="space-y-4 p-5">
          <h2 className={sectionTitle}>Summary</h2>
          <label className={label}>
            Sales tax
            <select value={taxId} onChange={(e) => setTaxId(e.target.value)} className={field}>
              <option value="">None</option>
              {(taxes.data ?? []).filter((t) => t.active || String(t.id) === taxId).map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({Number(t.rate)}%)</option>
              ))}
            </select>
          </label>
          <div className={label}>
            Discount
            <div className="mt-1 flex gap-2">
              <select aria-label="Discount type" value={discountMode} onChange={(e) => setDiscountMode(e.target.value as "amount" | "percent")} className={`${field} mt-0 w-24`}>
                <option value="amount">Amount</option>
                <option value="percent">Percent</option>
              </select>
              <input aria-label="Discount" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} className={`${field} mt-0`} />
            </div>
          </div>
          <dl className="space-y-2 border-t border-line pt-4 text-sm">
            <Row k="Subtotal" v={money(currency, show(totals.gross))} />
            {totals.grossMax !== null && <Row k="Estimate up to" v={money(currency, show(totals.grossMax))} />}
            {totals.disc > 0 && <Row k="Discount" v={`- ${money(currency, show(totals.disc))}`} />}
            {tax && <Row k={`${tax.name} (${Number(tax.rate)}%)`} v={money(currency, show(totals.taxAmount))} />}
            <div className="flex items-baseline justify-between border-t border-line pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{money(currency, show(totals.total))}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted">The server works out the final amounts again when you save.</p>
          <div className="space-y-2 pt-1">
            {kind === "quotation" && status === "sent" && !id ? (
              <Button tone="brand" type="button" disabled={busy} className="w-full" onClick={() => save("send")}>{busy ? "Saving…" : "Save and deliver"}</Button>
            ) : (
              <Button tone="brand" type="submit" disabled={busy} className="w-full">{busy ? "Saving…" : id ? "Save changes" : kind === "recurring" ? "Create schedule" : "Save as draft"}</Button>
            )}
            {kind === "invoice" && !id && <Button type="button" disabled={busy} className="w-full" onClick={() => save("issue")}>Save and issue</Button>}
            <Button type="button" className="w-full" onClick={() => nav(kind === "recurring" ? "/billing" : "/billing")}>Cancel</Button>
          </div>
        </Card>
      </aside>
    </form>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}

export { TITLES };
