"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/auth/ui";
import { api, STATUS_LABEL, type ClientRow, type Project } from "@/lib/api";
import Progress from "./Progress";

const field =
  "mt-2 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none";

export default function ProjectsList({ staff }: { staff: boolean }) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [tick, setTick] = useState(0);
  const load = () => setTick((t) => t + 1);

  useEffect(() => {
    api<Project[]>("GET", "/projects/").then((r) => {
      if (r.ok) setProjects(r.data);
      else setError(r.error);
    });
  }, [tick]);

  useEffect(() => {
    if (!staff) return;
    api<ClientRow[]>("GET", "/clients/").then((r) => r.ok && setClients(r.data ?? []));
  }, [staff]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const body: Record<string, unknown> = {
      title: f.get("title"),
      client: Number(f.get("client")),
      summary: f.get("summary"),
    };
    for (const k of ["start_date", "due_date"]) if (f.get(k)) body[k] = f.get(k);
    setBusy(true);
    setError("");
    const r = await api("POST", "/projects/", body);
    setBusy(false);
    if (r.ok) {
      form.reset();
      load();
    } else setError(r.error);
  }

  return (
    <div className="space-y-8">
      {error && <Alert>{error}</Alert>}
      {projects === null && !error && <p className="text-sm text-muted">Loading…</p>}
      {projects?.length === 0 && (
        <p className="text-sm text-muted">
          {staff ? "No projects yet. Create the first one below." : "You have no projects yet."}
        </p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2">
        {projects?.map((p) => (
          <li key={p.id}>
            <Link
              href={`/app/projects/${p.id}`}
              className="block rounded-xl border border-line bg-surface p-5 hover:border-brand/60"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold">{p.title}</h2>
                <span className="shrink-0 rounded-full border border-line px-2.5 py-0.5 font-mono text-[11px] text-muted">
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
              {staff && <p className="mt-1 text-xs text-muted">{p.client_email}</p>}
              <div className="mt-4">
                <Progress value={p.progress} />
              </div>
              {p.due_date && <p className="mt-3 font-mono text-[11px] text-muted">Due {p.due_date}</p>}
            </Link>
          </li>
        ))}
      </ul>

      {staff && (
        <form onSubmit={create} className="space-y-3 rounded-xl border border-line bg-surface p-5 text-sm">
          <h2 className="font-semibold">New project</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              Title
              <input name="title" required maxLength={200} className={field} />
            </label>
            <label>
              Client
              <select name="client" required defaultValue="" className={field}>
                <option value="" disabled>
                  Choose a client account
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company ? `${c.company} — ` : ""}
                    {c.email}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            Summary
            <textarea name="summary" rows={3} maxLength={3000} className={field} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              Start date
              <input name="start_date" type="date" className={field} />
            </label>
            <label>
              Due date
              <input name="due_date" type="date" className={field} />
            </label>
          </div>
          <p className="text-xs text-muted">A client must sign up first; then they appear in the list above.</p>
          <button
            disabled={busy}
            className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create project"}
          </button>
        </form>
      )}
    </div>
  );
}
