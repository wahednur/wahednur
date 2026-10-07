"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/auth/ui";
import {
  api,
  downloadFile,
  EXPENSE_CATEGORIES,
  fmt,
  type CurrencySummary,
  type Expense,
  type Project,
  type ProjectProfit,
} from "@/lib/api";
import { btn, field, ghost } from "@/components/app/billing/Bits";

const label = (v: string) => EXPENSE_CATEGORIES.find(([k]) => k === v)?.[1] ?? v;

export default function AccountingView() {
  const [range, setRange] = useState({ from: "", to: "" });
  const [summary, setSummary] = useState<Record<string, CurrencySummary> | null>(null);
  const [profit, setProfit] = useState<ProjectProfit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  const qs = new URLSearchParams(Object.entries(range).filter(([, v]) => v)).toString();
  const q = qs ? `?${qs}` : "";

  useEffect(() => {
    const fail = (r: { ok: boolean; error: string }) => !r.ok && setError(r.error);
    api<Record<string, CurrencySummary>>("GET", `/accounting/summary/${q}`).then((r) => (r.ok ? setSummary(r.data) : fail(r)));
    api<ProjectProfit[]>("GET", `/accounting/projects/${q}`).then((r) => (r.ok ? setProfit(r.data ?? []) : fail(r)));
    api<Expense[]>("GET", `/accounting/expenses/${q}`).then((r) => (r.ok ? setExpenses(r.data ?? []) : fail(r)));
  }, [q, tick]);

  useEffect(() => {
    api<Project[]>("GET", "/projects/").then((r) => r.ok && setProjects(r.data ?? []));
  }, []);

  async function addExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const body: Record<string, unknown> = Object.fromEntries([...f.entries()].filter(([, v]) => v !== ""));
    setError("");
    const r = await api("POST", "/accounting/expenses/", body);
    if (r.ok) {
      form.reset();
      setTick((t) => t + 1);
    } else setError(r.error);
  }

  async function remove(id: number) {
    if (!window.confirm("Remove this expense from the books?")) return;
    const r = await api("DELETE", `/accounting/expenses/${id}/`);
    if (r.ok) setTick((t) => t + 1);
    else setError(r.error);
  }

  const currencies = Object.keys(summary ?? {});

  return (
    <div className="space-y-10">
      {error && <Alert>{error}</Alert>}

      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label>
          From
          <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className={field} />
        </label>
        <label>
          To
          <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className={field} />
        </label>
        <button type="button" className={ghost} onClick={() => setRange({ from: "", to: "" })}>
          All time
        </button>
        <button
          type="button"
          className={ghost}
          onClick={async () => {
            const msg = await downloadFile(`/accounting/export/${q}`, "ledger.csv");
            if (msg) setError(msg);
          }}
        >
          Download ledger (CSV)
        </button>
      </div>

      {summary && currencies.length === 0 && (
        <p className="text-sm text-muted">Nothing recorded yet. Payments on invoices and expenses appear here.</p>
      )}

      {currencies.map((cur) => {
        const s = summary![cur];
        return (
          <section key={cur} aria-label={`${cur} summary`} className="space-y-4">
            <h2 className="text-lg font-semibold">{cur}</h2>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {(
                [
                  ["Received", s.received],
                  ["Spent", s.spent],
                  ["Net", s.net],
                  ["Still owed to you", s.receivable],
                  ["Overdue", s.overdue],
                ] as const
              ).map(([name, value]) => (
                <div key={name} className="rounded-xl border border-line bg-surface p-4">
                  <p className="text-xs text-muted">{name}</p>
                  <p className={`mt-1 text-lg font-semibold ${name === "Overdue" && Number(value) > 0 ? "text-red-300" : ""}`}>
                    {fmt(cur, value)}
                  </p>
                </div>
              ))}
            </div>
            {s.months.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead className="text-left font-mono text-[11px] uppercase text-muted">
                    <tr>
                      <th className="p-3">Month</th>
                      <th className="p-3 text-right">Received</th>
                      <th className="p-3 text-right">Spent</th>
                      <th className="p-3 text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {s.months.map((m) => (
                      <tr key={m.month}>
                        <td className="p-3">{m.month}</td>
                        <td className="p-3 text-right">{fmt(cur, m.received)}</td>
                        <td className="p-3 text-right">{fmt(cur, m.spent)}</td>
                        <td className="p-3 text-right font-medium">{fmt(cur, m.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}

      {profit.length > 0 && (
        <section aria-labelledby="pp">
          <h2 id="pp" className="text-lg font-semibold">
            By project
          </h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="text-left font-mono text-[11px] uppercase text-muted">
                <tr>
                  <th className="p-3">Project</th>
                  <th className="p-3 text-right">Invoiced</th>
                  <th className="p-3 text-right">Received</th>
                  <th className="p-3 text-right">Expenses</th>
                  <th className="p-3 text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {profit.map((p) => (
                  <tr key={`${p.project}${p.currency}`}>
                    <td className="p-3">{p.title}</td>
                    <td className="p-3 text-right">{fmt(p.currency, p.invoiced)}</td>
                    <td className="p-3 text-right">{fmt(p.currency, p.received)}</td>
                    <td className="p-3 text-right">{fmt(p.currency, p.spent)}</td>
                    <td className="p-3 text-right font-medium">{fmt(p.currency, p.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-labelledby="ex" className="space-y-4">
        <h2 id="ex" className="text-lg font-semibold">
          Expenses
        </h2>
        {expenses.length === 0 && <p className="text-sm text-muted">No expenses in this period.</p>}
        <ul className="divide-y divide-line rounded-xl border border-line">
          {expenses.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p className="font-medium">
                  {label(x.category)}
                  {x.vendor && ` · ${x.vendor}`}
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted">
                  {x.spent_on}
                  {x.project_title && ` · ${x.project_title}`}
                  {x.description && ` · ${x.description}`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span>{fmt(x.currency, x.amount)}</span>
                <button type="button" className="text-muted hover:text-red-400" onClick={() => remove(x.id)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>

        <form onSubmit={addExpense} className="space-y-3 rounded-xl border border-line bg-surface p-5 text-sm">
          <h3 className="font-semibold">Add an expense</h3>
          <div className="grid gap-3 sm:grid-cols-4">
            <label>
              Date
              <input name="spent_on" type="date" required className={field} />
            </label>
            <label>
              Category
              <select name="category" defaultValue="hosting" className={field}>
                {EXPENSE_CATEGORIES.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount
              <input name="amount" type="number" min="0.01" step="0.01" required className={field} />
            </label>
            <label>
              Currency
              <select name="currency" defaultValue="BDT" className={field}>
                <option value="BDT">BDT (৳)</option>
                <option value="USD">USD ($)</option>
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              Vendor
              <input name="vendor" maxLength={150} className={field} />
            </label>
            <label>
              Note
              <input name="description" maxLength={300} className={field} />
            </label>
            <label>
              Project (optional)
              <select name="project" defaultValue="" className={field}>
                <option value="">General</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className={btn}>Add expense</button>
        </form>
      </section>
    </div>
  );
}
