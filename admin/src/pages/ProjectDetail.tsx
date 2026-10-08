import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Card, field, Loading, Notice, PageHeader, useLoad } from "@/components/ui";
import { day, money } from "@/lib/format";
import { api } from "@/lib/http";
import type { BillRow, Milestone, ProjectDetailData } from "@/lib/types";

const NEXT: Record<string, string[]> = {
  proposal: ["active", "cancelled"],
  active: ["on_hold", "completed", "cancelled"],
  on_hold: ["active", "cancelled"],
  completed: ["active"],
  cancelled: [],
};
const LABEL: Record<string, string> = { proposal: "Proposal", active: "In progress", on_hold: "On hold", completed: "Completed", cancelled: "Cancelled" };
const MS: [Milestone["status"], string][] = [["todo", "To do"], ["in_progress", "In progress"], ["done", "Done"]];

export default function ProjectDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: p, error, reload } = useLoad<ProjectDetailData>(`/projects/${id}/`);
  const invoices = useLoad<BillRow[]>(`/invoices/?project=${id}`);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(false);

  async function run(promise: Promise<{ ok: boolean; error: string }>, after?: () => void) {
    setMsg("");
    const r = await promise;
    if (!r.ok) return setMsg(r.error);
    after?.();
    reload();
  }

  if (error) return <Notice>{error}</Notice>;
  if (!p) return <Loading />;

  const addMilestone = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    return run(
      api("POST", `/projects/${id}/milestones/`, {
        title: String(f.get("title")),
        description: String(f.get("description") ?? ""),
        position: p.milestones.length,
        ...(f.get("due_date") ? { due_date: String(f.get("due_date")) } : {}),
      }),
      () => form.reset(),
    );
  };
  const addUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    return run(api("POST", `/projects/${id}/updates/`, { message: String(f.get("message")), is_public: f.get("is_public") === "on" }), () => form.reset());
  };
  const saveDetails = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    return run(
      api("PATCH", `/projects/${id}/`, {
        title: String(f.get("title")),
        summary: String(f.get("summary")),
        start_date: f.get("start_date") ? String(f.get("start_date")) : null,
        due_date: f.get("due_date") ? String(f.get("due_date")) : null,
      }),
      () => setEditing(false),
    );
  };

  return (
    <>
      <Link to="/projects" className="text-sm text-muted hover:text-brand">← Projects</Link>
      <div className="mt-3">
        <PageHeader
          title={p.title}
          intro={`${p.client_email}${p.due_date ? ` · due ${day(p.due_date)}` : ""}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Badge value={p.status} />
              {NEXT[p.status].map((s) => (
                <Button key={s} small tone={s === "cancelled" ? "danger" : "plain"} onClick={() => run(api("PATCH", `/projects/${id}/`, { status: s }))}>
                  {LABEL[s]}
                </Button>
              ))}
            </div>
          }
        />
      </div>
      {msg && <div className="mb-4"><Notice>{msg}</Notice></div>}

      <Card className="mb-5 p-5">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-brand" style={{ width: `${p.progress}%` }} />
          </div>
          <span className="font-mono text-sm">{p.progress}%</span>
        </div>
        <p className="mt-1 text-xs text-muted">Worked out from the milestones marked Done. It is never typed in by hand.</p>
        {editing ? (
          <form onSubmit={saveDetails} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Title<input name="title" required maxLength={200} defaultValue={p.title} className={field} /></label>
            <label className="text-sm">Summary<input name="summary" maxLength={500} defaultValue={p.summary} className={field} /></label>
            <label className="text-sm">Start date<input name="start_date" type="date" defaultValue={p.start_date ?? ""} className={field} /></label>
            <label className="text-sm">Due date<input name="due_date" type="date" defaultValue={p.due_date ?? ""} className={field} /></label>
            <div className="flex gap-2 sm:col-span-2"><Button tone="brand" type="submit">Save</Button><Button type="button" onClick={() => setEditing(false)}>Cancel</Button></div>
          </form>
        ) : (
          <div className="mt-3 flex items-start justify-between gap-3 text-sm">
            <p className="text-muted">{p.summary || "No summary."}</p>
            <div className="flex shrink-0 gap-2">
              <Button small onClick={() => setEditing(true)}>Edit details</Button>
              <Button small tone="danger" onClick={() => confirm("Delete this project? Its invoices and files stay on record.") && run(api("DELETE", `/projects/${id}/`), () => nav("/projects"))}>Delete</Button>
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Milestones</h2>
          {p.milestones.length === 0 && <p className="mb-3 text-sm text-muted">No milestones yet. Add the parts of the project, such as design approved, first working version, final delivery.</p>}
          <ul className="space-y-2">
            {p.milestones.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 rounded-lg border border-line bg-bg/40 p-3 text-sm">
                <div>
                  <p className={m.status === "done" ? "text-muted line-through" : "font-medium"}>{m.title}</p>
                  {m.description && <p className="text-xs text-muted">{m.description}</p>}
                  {m.due_date && <p className="font-mono text-[11px] text-muted">{day(m.due_date)}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <select aria-label={`Status of ${m.title}`} value={m.status} onChange={(e) => run(api("PATCH", `/milestones/${m.id}/`, { status: e.target.value }))} className={`${field} mt-0 py-1 text-xs`}>
                    {MS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <Button small tone="danger" aria-label={`Remove ${m.title}`} onClick={() => confirm("Remove this milestone?") && run(api("DELETE", `/milestones/${m.id}/`))}>×</Button>
                </div>
              </li>
            ))}
          </ul>
          <form onSubmit={addMilestone} className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-[1fr_9rem_auto]">
            <input name="title" required maxLength={200} placeholder="New milestone" aria-label="New milestone" className={`${field} mt-0`} />
            <input name="due_date" type="date" aria-label="Milestone due date" className={`${field} mt-0`} />
            <Button type="submit" tone="brand">Add</Button>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Updates</h2>
          <form onSubmit={addUpdate} className="mb-4 space-y-2">
            <textarea name="message" required rows={3} maxLength={2000} placeholder="What happened?" aria-label="Update" className={field} />
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm"><input name="is_public" type="checkbox" defaultChecked /> Visible to the client</label>
              <Button type="submit" tone="brand">Post update</Button>
            </div>
          </form>
          {p.updates.length === 0 ? <p className="text-sm text-muted">No updates yet.</p> : (
            <ul className="space-y-3">
              {p.updates.map((u) => (
                <li key={u.id} className="rounded-lg border border-line bg-bg/40 p-3 text-sm">
                  <p className="whitespace-pre-line">{u.message}</p>
                  <p className="mt-1 flex items-center gap-2 font-mono text-[11px] text-muted">
                    {day(u.created_at)} · {u.author_email ?? "system"}
                    <span className={u.is_public ? "text-emerald-300" : "text-amber-200"}>{u.is_public ? "client can see" : "internal only"}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-5 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Invoices for this project</h2>
          <Button small onClick={() => nav("/billing/new/invoice")}>New invoice</Button>
        </div>
        {!invoices.data || invoices.data.length === 0 ? <p className="text-sm text-muted">No invoices yet. Work starts after the advance is paid, and final delivery follows full payment.</p> : (
          <ul className="divide-y divide-line text-sm">
            {invoices.data.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                <Link to={`/billing/invoices/${i.id}`} className="font-mono text-brand hover:underline">{i.number}</Link>
                <span>{money(i.currency, i.total)}</span>
                <span className="text-muted">still due {money(i.currency, i.outstanding ?? "0")}</span>
                <Badge value={i.state ?? i.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
