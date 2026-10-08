import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Card, Loading, Notice, PageHeader, useLoad } from "@/components/ui";
import { day, money } from "@/lib/format";
import { api } from "@/lib/http";
import type { RecurringInv } from "@/lib/types";

const FREQ: Record<string, string> = { weekly: "every week", monthly: "every month", quarterly: "every 3 months", yearly: "every year" };

export default function RecurringDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: r, error, reload } = useLoad<RecurringInv>(`/billing/recurring/${id}/`);
  const [msg, setMsg] = useState("");

  async function act(action: "pause" | "resume" | "end") {
    setMsg("");
    const res = await api("POST", `/billing/recurring/${id}/${action}/`, {});
    if (!res.ok) setMsg(res.error);
    reload();
  }
  if (error) return <Notice>{error}</Notice>;
  if (!r) return <Loading />;

  return (
    <>
      <Link to="/billing" className="text-sm text-muted hover:text-brand">← Billing</Link>
      <div className="mt-3">
        <PageHeader
          title={r.title}
          intro={`${r.client_email} · ${r.project_title}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Badge value={r.status} />
              {r.status !== "ended" && <Button small onClick={() => nav(`/billing/recurring/${id}/edit`)}>Edit</Button>}
              {r.status === "active" && <Button small onClick={() => act("pause")}>Pause</Button>}
              {r.status === "paused" && <Button small tone="brand" onClick={() => act("resume")}>Resume</Button>}
              {r.status !== "ended" && <Button small tone="danger" onClick={() => confirm("End this schedule for good?") && act("end")}>End</Button>}
            </div>
          }
        />
      </div>
      {msg && <div className="mb-4"><Notice>{msg}</Notice></div>}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <p className="text-sm text-muted">
            An invoice of <b className="text-ink">{money(r.currency, r.total)}</b> {FREQ[r.frequency]}
            {r.next_run && <>, next on <b className="text-ink">{day(r.next_run)}</b></>}
            {r.end_date && <>, until {day(r.end_date)}</>}. Each is due {r.due_days} days after its date and is
            {r.auto_issue ? " issued and emailed automatically." : " made as a draft for you to check and issue."}
          </p>
          <table className="mt-4 w-full text-sm">
            <thead className="text-xs uppercase text-muted"><tr><th className="py-2 text-left font-medium">Item</th><th className="text-right font-medium">Qty</th><th className="text-right font-medium">Price</th></tr></thead>
            <tbody className="divide-y divide-line">
              {r.items.map((i, n) => (
                <tr key={n}><td className="py-2">{i.description}</td><td className="text-right">{i.quantity}</td><td className="text-right">{money(r.currency, i.unit_price)}</td></tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{money(r.currency, r.subtotal)}</dd></div>
            {Number(r.discount) > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>-{money(r.currency, r.discount)}</dd></div>}
            {Number(r.tax) > 0 && <div className="flex justify-between"><dt className="text-muted">{r.tax_name} ({Number(r.tax_rate)}%)</dt><dd>{money(r.currency, r.tax)}</dd></div>}
            <div className="flex justify-between font-semibold"><dt>Each invoice</dt><dd>{money(r.currency, r.total)}</dd></div>
          </dl>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Invoices made so far</h2>
          {r.invoices.length === 0 ? <p className="text-sm text-muted">None yet. The first one is made on {day(r.start_date)}.</p> : (
            <ul className="space-y-2 text-sm">
              {r.invoices.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2">
                  <Link to={`/billing/invoices/${i.id}`} className="font-mono text-brand hover:underline">{i.number}</Link>
                  <span className="font-mono text-xs text-muted">{day(i.run_date)}</span>
                  <Badge value={i.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
