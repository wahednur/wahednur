import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge, Button, Card, field, Loading, Notice, PageHeader, useLoad } from "@/components/ui";
import { day, money } from "@/lib/format";
import { api, download } from "@/lib/http";
import type { Invoice } from "@/lib/types";

const METHODS = [
  ["bank", "Bank transfer"],
  ["bkash", "bKash"],
  ["nagad", "Nagad"],
  ["cash", "Cash"],
  ["card", "Card or gateway"],
  ["other", "Other"],
];

export default function InvoiceDetail() {
  const { id } = useParams();
  const { data: inv, error, reload } = useLoad<Invoice>(`/invoices/${id}/`);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");

  async function act(action: "issue" | "cancel") {
    setMsg("");
    const r = await api("POST", `/invoices/${id}/${action}/`, {});
    if (!r.ok) setMsg(r.error);
    reload();
  }
  async function pay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    setOk("");
    const form = e.currentTarget;
    const f = new FormData(form);
    const r = await api("POST", `/invoices/${id}/payments/`, {
      amount: String(f.get("amount")),
      method: String(f.get("method")),
      reference: String(f.get("reference") ?? ""),
      paid_on: String(f.get("paid_on")),
      note: String(f.get("note") ?? ""),
    });
    if (!r.ok) return setMsg(r.error);
    form.reset();
    setOk("Payment recorded.");
    reload();
  }

  if (error) return <Notice>{error}</Notice>;
  if (!inv) return <Loading />;
  const draft = inv.status === "draft";
  const open = inv.status === "issued" && Number(inv.outstanding) > 0;

  return (
    <>
      <Link to="/billing" className="text-sm text-muted hover:text-brand">← Billing</Link>
      <div className="mt-3">
        <PageHeader
          title={`${inv.number}: ${inv.title}`}
          intro={`${inv.client_email} · ${inv.project_title}`}
          action={
            <div className="flex gap-2">
              <Button small onClick={async () => setMsg(await download(`/invoices/${id}/pdf/`, `${inv.number}.pdf`))}>PDF</Button>
              {draft && <Button small tone="brand" onClick={() => act("issue")}>Issue</Button>}
              {inv.status !== "cancelled" && Number(inv.paid_total) === 0 && (
                <Button small tone="danger" onClick={() => confirm("Cancel this invoice?") && act("cancel")}>Cancel</Button>
              )}
            </div>
          }
        />
      </div>
      {msg && <div className="mb-4"><Notice>{msg}</Notice></div>}
      {ok && <div className="mb-4"><Notice kind="ok">{ok}</Notice></div>}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-3"><Badge value={inv.state ?? inv.status} /></div>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr><th className="py-2 text-left font-medium">Item</th><th className="text-right font-medium">Qty</th><th className="text-right font-medium">Price</th><th className="text-right font-medium">Amount</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {inv.items.map((i, n) => (
                <tr key={n}>
                  <td className="py-2">{i.description}</td>
                  <td className="text-right">{i.quantity}</td>
                  <td className="text-right">{money(inv.currency, i.unit_price)}</td>
                  <td className="text-right">{money(inv.currency, i.amount ?? "0")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
            <Line k="Subtotal" v={money(inv.currency, inv.subtotal)} />
            {Number(inv.discount) > 0 && <Line k="Discount" v={`-${money(inv.currency, inv.discount)}`} />}
            <Line k="Total" v={money(inv.currency, inv.total)} bold />
            <Line k="Paid" v={money(inv.currency, inv.paid_total)} />
            <Line k="Still due" v={money(inv.currency, inv.outstanding ?? "0")} bold />
          </dl>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Installments</h2>
            {inv.installments.length === 0 ? <p className="text-sm text-muted">One payment, no plan.</p> : (
              <ul className="space-y-2 text-sm">
                {inv.installments.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2">
                    <span>{s.label}<span className="block font-mono text-[11px] text-muted">{day(s.due_date)}</span></span>
                    <span className="text-right">{money(inv.currency, s.amount)}<span className="ml-2"><Badge value={s.state} /></span></span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Payments</h2>
            {inv.payments.length === 0 ? <p className="text-sm text-muted">None yet.</p> : (
              <ul className="space-y-2 text-sm">
                {inv.payments.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span>{day(p.paid_on)} · {p.method}{p.reference && <span className="block font-mono text-[11px] text-muted">{p.reference}</span>}</span>
                    <span>{money(inv.currency, p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {open && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold">Record a payment</h2>
              <form onSubmit={pay} className="space-y-3 text-sm">
                <label className="block">Amount ({inv.currency})<input name="amount" required inputMode="decimal" className={field} /></label>
                <label className="block">Method
                  <select name="method" className={field}>{METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                </label>
                <label className="block">Reference / transaction ID<input name="reference" maxLength={100} className={field} /></label>
                <label className="block">Paid on<input name="paid_on" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={field} /></label>
                <label className="block">Note<input name="note" maxLength={300} className={field} /></label>
                <Button tone="brand" type="submit" className="w-full">Record payment</Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Line({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <dt className={bold ? "" : "text-muted"}>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
