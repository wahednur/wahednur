import { useCallback, useEffect, useState } from "react";
import { Button, Card, field, Notice } from "@/components/ui";
import { api } from "@/lib/http";

type Draft = { id: number | null; date: string; summary: string; items: string[]; next_steps: string; hours: string | number | null; published: boolean };
const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in the local time zone

/** End-of-day report. It starts from what the system already knows (finished milestones, public notes), you edit it, then publish: the client is notified. */
export default function DailyReport({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [date, setDate] = useState(today());
  const [d, setD] = useState<Draft | null>(null);
  const [lines, setLines] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (day: string) => {
    const r = await api<Draft>("GET", `/projects/${projectId}/reports/draft/?date=${day}`);
    if (!r.ok || !r.data) return setMsg({ ok: false, text: r.error });
    setD(r.data);
    setLines(r.data.items.join("\n"));
  }, [projectId]);
  useEffect(() => {
    const t = setTimeout(() => void load(date), 0);
    return () => clearTimeout(t);
  }, [date, load]);

  async function save(publish: boolean) {
    if (!d) return;
    setBusy(true);
    setMsg(null);
    const r = await api("POST", `/projects/${projectId}/reports/`, {
      date, summary: d.summary, items: lines.split("\n").map((l) => l.trim()).filter(Boolean),
      next_steps: d.next_steps, hours: d.hours === null ? "" : d.hours, publish,
    });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setMsg({ ok: true, text: publish ? "Published. The client has been notified." : "Draft saved. The client cannot see it yet." });
    await load(date);
    onDone();
  }

  return (
    <Card className="mt-5 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">End-of-day report</h2>
        <input type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Report date" className={`${field} mt-0 w-auto`} />
      </div>
      {!d ? <p className="text-sm text-muted">Loading…</p> : (
        <div className="space-y-3 text-sm">
          {d.published && <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-2.5 text-xs text-emerald-200">This report is published. Editing it changes what the client sees, but does not notify them again.</p>}
          <label className="block">One-line summary
            <input value={d.summary} onChange={(e) => setD({ ...d, summary: e.target.value })} maxLength={300} placeholder="Checkout page finished" className={field} />
          </label>
          <label className="block">What was done (one line each)
            <textarea value={lines} onChange={(e) => setLines(e.target.value)} rows={5} placeholder={"Built the cart page\nFixed the footer links"} className={field} />
          </label>
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <label className="block">What comes next
              <input value={d.next_steps} onChange={(e) => setD({ ...d, next_steps: e.target.value })} maxLength={1500} className={field} />
            </label>
            <label className="block">Hours
              <input type="number" min={0} max={24} step={0.5} value={d.hours ?? ""} onChange={(e) => setD({ ...d, hours: e.target.value })} className={field} />
            </label>
          </div>
          {msg && <Notice kind={msg.ok ? "ok" : "error"}>{msg.text}</Notice>}
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => save(false)}>Save draft</Button>
            <Button tone="brand" disabled={busy} onClick={() => save(true)}>{d.published ? "Update report" : "Publish to client"}</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
