import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { InstallmentsEditor, presetSteps, stepsToApi, type Step } from "@/components/DocumentEditor";
import QuoteDocument from "@/components/QuoteDocument";
import { Badge, Button, Card, field, Loading, Notice, PageHeader, useLoad } from "@/components/ui";
import { day } from "@/lib/format";
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

  async function act(action: "send" | "accept" | "reject" | "dead") {
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
          intro={`${q.client_email} · ${q.project_title} · dated ${day(q.issue_date)}${q.valid_until ? ` · expires ${day(q.valid_until)}` : ""}`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button small onClick={async () => setMsg(await download(`/quotations/${id}/pdf/`, `${q.number}.pdf`))}>PDF</Button>
              {q.status === "draft" && <Button small onClick={() => nav(`/billing/quotation/${id}/edit`)}>Edit</Button>}
              {(q.status === "draft" || q.status === "sent") && (
                <select
                  aria-label="Change status"
                  value=""
                  onChange={(e) => {
                    const v = e.target.value as "send" | "accept" | "reject" | "dead";
                    if (v && (v !== "dead" || confirm("Mark this quote as dead?"))) void act(v);
                  }}
                  className={`${field} mt-0 w-auto py-1.5 text-xs`}
                >
                  <option value="">Change status…</option>
                  {q.status === "draft" && <option value="send">Delivered (email to client)</option>}
                  {q.status === "sent" && <option value="accept">Accepted</option>}
                  {q.status === "sent" && <option value="reject">Lost</option>}
                  <option value="dead">Dead</option>
                </select>
              )}
              {q.status === "accepted" && !q.invoice_id && (
                <Button
                  small
                  tone="brand"
                  onClick={() => {
                    if (!converting && q.payment_plan.length)
                      setSteps(q.payment_plan.map((p) => ({ label: p.label, mode: "percent" as const, value: String(Number(p.percent)), due_date: "" })));
                    setConverting((v) => !v);
                  }}
                >
                  Create invoice
                </Button>
              )}
            </div>
          }
        />
      </div>
      {msg && <div className="mb-4"><Notice>{msg}</Notice></div>}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Badge value={q.status} />
        {q.invoice_id && <Link className="text-sm text-brand hover:underline" to={`/billing/invoices/${q.invoice_id}`}>Open its invoice</Link>}
        <a className="text-sm text-brand hover:underline" href={`/print/quotation/${q.id}`} target="_blank" rel="noreferrer">Print or save as PDF (Bengali works) ↗</a>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line"><QuoteDocument q={q} from="Abdul Wahed Nur" /></div>

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
