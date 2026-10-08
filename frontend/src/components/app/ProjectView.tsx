"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/auth/ui";
import { api, NEXT_STATUS, STATUS_LABEL, type HistoryEvent, type Milestone, type ProjectDetail } from "@/lib/api";
import DocumentsPanel from "./DocumentsPanel";
import Progress from "./Progress";
import StepTracker from "./StepTracker";
import WorkHistory from "./WorkHistory";

const field =
  "mt-2 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none";
const MS_NEXT: Record<Milestone["status"], Milestone["status"]> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};
const MS_LABEL: Record<Milestone["status"], string> = { todo: "To do", in_progress: "In progress", done: "Done" };

export default function ProjectView({ id, staff }: { id: string; staff: boolean }) {
  const [p, setP] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);

  const [tick, setTick] = useState(0);
  const [history, setHistory] = useState<HistoryEvent[] | null>(null);

  useEffect(() => {
    api<ProjectDetail>("GET", `/projects/${id}/`).then((r) => {
      if (r.ok) setP(r.data);
      else if (r.status === 404) setMissing(true);
      else setError(r.error);
    });
    api<HistoryEvent[]>("GET", `/projects/${id}/history/`).then((r) => r.ok && setHistory(r.data));
  }, [id, tick]);

  async function act(method: string, path: string, body?: unknown) {
    setError("");
    const r = await api(method, path, body);
    if (!r.ok) setError(r.error);
    else setTick((t) => t + 1);
    return r.ok;
  }

  if (missing) return <p className="text-sm text-muted">This project does not exist or is not yours.</p>;
  if (!p) return error ? <Alert>{error}</Alert> : <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{p.title}</h1>
          <span className="rounded-full border border-line px-3 py-1 font-mono text-xs text-muted">
            {STATUS_LABEL[p.status]}
          </span>
        </div>
        {staff && <p className="text-sm text-muted">Client: {p.client_email}</p>}
        {p.summary && <p className="max-w-3xl text-sm leading-6 text-muted">{p.summary}</p>}
        <p className="font-mono text-[11px] text-muted">
          {p.start_date ? `Start ${p.start_date}` : ""} {p.due_date ? `· Due ${p.due_date}` : ""}
        </p>
        {p.milestones.length === 0 && <Progress value={p.progress} />}
        {staff && NEXT_STATUS[p.status].length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 text-sm">
            {NEXT_STATUS[p.status].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => act("PATCH", `/projects/${id}/`, { status: s })}
                className="rounded-md border border-line px-3 py-1.5 hover:border-brand/60"
              >
                Mark {STATUS_LABEL[s].toLowerCase()}
              </button>
            ))}
          </div>
        )}
      </header>

      {error && <Alert>{error}</Alert>}

      <StepTracker steps={p.milestones} progress={p.progress} />

      <section aria-labelledby="ms">
        <h2 id="ms" className="text-lg font-semibold">
          Milestones
        </h2>
        {p.milestones.length === 0 && <p className="mt-3 text-sm text-muted">No milestones yet.</p>}
        <ol className="mt-3 divide-y divide-line rounded-xl border border-line">
          {p.milestones.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p className={m.status === "done" ? "text-muted line-through" : "font-medium"}>{m.title}</p>
                {m.description && <p className="mt-1 text-xs text-muted">{m.description}</p>}
                {m.due_date && <p className="mt-1 font-mono text-[11px] text-muted">Due {m.due_date}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-muted">{MS_LABEL[m.status]}</span>
                {staff && (
                  <>
                    <button
                      type="button"
                      onClick={() => act("PATCH", `/milestones/${m.id}/`, { status: MS_NEXT[m.status] })}
                      className="text-brand hover:underline"
                    >
                      → {MS_LABEL[MS_NEXT[m.status]]}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.confirm("Delete this milestone?") && act("DELETE", `/milestones/${m.id}/`)}
                      className="text-muted hover:text-red-400"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
        {staff && (
          <form
            className="mt-3 flex flex-wrap items-end gap-3 text-sm"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const f = new FormData(form);
              const body: Record<string, unknown> = { title: f.get("title") };
              if (f.get("due_date")) body.due_date = f.get("due_date");
              if (await act("POST", `/projects/${id}/milestones/`, body)) form.reset();
            }}
          >
            <label className="min-w-48 flex-1">
              New milestone
              <input name="title" required maxLength={200} className={field} />
            </label>
            <label>
              Due
              <input name="due_date" type="date" className={field} />
            </label>
            <button className="rounded-md bg-brand px-4 py-2.5 font-semibold text-bg hover:opacity-90">Add</button>
          </form>
        )}
      </section>

      <section id="reports" aria-labelledby="up" className="scroll-mt-20">
        <h2 id="up" className="text-lg font-semibold">
          Work history
        </h2>
        <div className="mt-4">{history ? <WorkHistory events={history} staff={staff} /> : <p className="text-sm text-muted">Loading…</p>}</div>
        {staff && (
          <form
            className="mt-3 space-y-3 text-sm"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const f = new FormData(form);
              const ok = await act("POST", `/projects/${id}/updates/`, {
                message: f.get("message"),
                is_public: f.get("is_public") === "on",
              });
              if (ok) form.reset();
            }}
          >
            <label className="block">
              Add a note
              <textarea name="message" required rows={3} maxLength={3000} className={field} />
            </label>
            <label className="flex items-center gap-2">
              <input name="is_public" type="checkbox" defaultChecked /> Visible to the client (untick for an internal note)
            </label>
            <button className="rounded-md bg-brand px-4 py-2.5 font-semibold text-bg hover:opacity-90">Post note</button>
          </form>
        )}
      </section>

      <section aria-labelledby="docs">
        <h2 id="docs" className="mb-3 text-lg font-semibold">
          Documents
        </h2>
        <DocumentsPanel staff={staff} projectId={id} />
      </section>
    </div>
  );
}
