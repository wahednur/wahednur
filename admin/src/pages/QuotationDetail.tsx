import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { InstallmentsEditor, presetSteps, stepsToApi, type Step } from "@/components/DocumentEditor";
import { Badge, Button, Card, field, Loading, Notice, PageHeader, useLoad } from "@/components/ui";
import { day, money } from "@/lib/format";
import { api, download } from "@/lib/http";
import type { Quotation } from "@/lib/types";

export default function QuotationDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: q, error, reload } = useLoad<Quotation>(`/quotations/${id}/`);
  const [msg, setMsg] = useState("");
  const [converting, setConverting] = useState(false);
  const [steps, setSteps] = useState<Step[]>(presetSteps());
  const [due, setDue] = useState("");

  async function act(action: "send" | "accept" | "reject") {
    setMsg("");
    const r = await api("POST", `/quotations/${id}/${action}/`, {});
    if (!r.ok) setMsg(r.error);
    reload();
  }
  async function convert() {
    setMsg("");
    const r = await api<{ id: string }>("POST", `/quotations/${id}/convert/`, {
      installments: stepsToApi(steps),
      ...(due ? { due_date: due } : {}),
    });
    if (!r.ok || !r.data) return setMsg(r.error);
    nav(`/billing/invoices/${r.data.id}`);
  }

  if (error) return <Notice>{error}</Notice>;
  if (!q) return <Loading />;
  const total = Math.round(Number(q.total) * 100);

  return (
    <>
      <Link to="/billing" className="text-sm text-muted hover:text-brand">← Billing</Link>
      <div className="mt-3">
        <PageHeader
          title={`${q.number}: ${q.title}`}
          intro={`${q.client_email} · ${q.project_title}${q.valid_until ? ` · valid until ${day(q.valid_until)}` : ""}`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button small onClick={async () => setMsg(await download(`/quotations/${id}/pdf/`, `${q.number}.pdf`))}>PDF</Button>
              {q.status === "draft" && <Button small onClick={() => nav(`/billing/quotation/${id}/edit`)}>Edit</Button>}
              {q.status === "draft" && <Button small tone="brand" onClick={() => act("send")}>Send to client</Button>}
              {q.status === "sent" && <Button small onClick={() => act("accept")}>Mark accepted</Button>}
              {q.status === "sent" && <Button small tone="danger" onClick={() => act("reject")}>Mark rejected</Button>}
              {q.status === "accepted" && !q.invoice_id && <Button small tone="brand" onClick={() => setConverting((v) => !v)}>Create invoice</Button>}
            </div>
          }
        />
      </div>
      {msg && <div className="mb-4"><Notice>{msg}</Notice></div>}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-3">
          <Badge value={q.status} />
          {q.invoice_id && <Link className="text-sm text-brand hover:underline" to={`/billing/invoices/${q.invoice_id}`}>Open its invoice</Link>}
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr><th className="py-2 text-left font-medium">Item</th><th className="text-right font-medium">Qty</th><th className="text-right font-medium">Price</th><th className="text-right font-medium">Amount</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {q.items.map((i, n) => (
              <tr key={n}>
                <td className="py-2">{i.description}</td>
                <td className="text-right">{i.quantity}</td>
                <td className="text-right">{money(q.currency, i.unit_price)}</td>
                <td className="text-right">{money(q.currency, i.amount ?? "0")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{money(q.currency, q.subtotal)}</dd></div>
          {Number(q.discount) > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>-{money(q.currency, q.discount)}</dd></div>}
          <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{money(q.currency, q.total)}</dd></div>
        </dl>
        {q.notes && <p className="mt-4 whitespace-pre-line border-t border-line pt-3 text-sm text-muted">{q.notes}</p>}
      </Card>

      {converting && (
        <Card className="mt-5 p-5">
          <h2 className="mb-3 text-sm font-semibold">Invoice payment plan</h2>
          <InstallmentsEditor steps={steps} onChange={setSteps} total={total} currency={q.currency} />
          <label className="mt-4 block text-sm">
            Invoice due date (optional)
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${field} max-w-xs`} />
          </label>
          <div className="mt-4"><Button tone="brand" onClick={convert}>Create draft invoice</Button></div>
        </Card>
      )}
    </>
  );
}
