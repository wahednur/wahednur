"use client";

import { useEffect, useState } from "react";
import { api, CATEGORIES, type Doc, type Project } from "@/lib/api";
import { Alert } from "@/components/auth/ui";

const size = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);
const select =
  "mt-2 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none";

/** Lists documents (all of them, or one project's) with download; staff also upload and unshare. */
export default function DocumentsPanel({ staff, projectId }: { staff: boolean; projectId?: string }) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const query = projectId ? `?project=${projectId}` : "";

  const [tick, setTick] = useState(0);
  const load = () => setTick((t) => t + 1);

  useEffect(() => {
    api<Doc[]>("GET", `/documents/${query}`).then((r) => {
      if (r.ok) setDocs(r.data);
      else setError(r.error);
    });
  }, [query, tick]);

  useEffect(() => {
    if (!staff || projectId) return;
    api<Project[]>("GET", "/projects/").then((r) => r.ok && setProjects(r.data ?? []));
  }, [staff, projectId]);

  async function download(id: string) {
    setError("");
    const r = await api<{ url: string }>("GET", `/documents/${id}/download/`);
    if (r.ok && r.data) window.location.assign(r.data.url);
    else setError(r.error);
  }

  async function toggleShare(d: Doc) {
    const r = await api("PATCH", `/documents/${d.id}/`, { shared_with_client: !d.shared_with_client });
    if (r.ok) load();
    else setError(r.error);
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this document from the list? The file itself is kept.")) return;
    const r = await api("DELETE", `/documents/${id}/`);
    if (r.ok) load();
    else setError(r.error);
  }

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (projectId) data.set("project", projectId);
    else if (!data.get("project")) data.delete("project");
    if (!data.get("shared_with_client")) data.set("shared_with_client", "false");
    setBusy(true);
    setError("");
    const r = await api("POST", "/documents/", data);
    setBusy(false);
    if (r.ok) {
      form.reset();
      load();
    } else setError(r.error);
  }

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}
      {docs === null && !error && <p className="text-sm text-muted">Loading…</p>}
      {docs?.length === 0 && <p className="text-sm text-muted">No documents yet.</p>}
      <ul className="divide-y divide-line rounded-xl border border-line">
        {docs?.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{d.title}</p>
              <p className="mt-1 font-mono text-[11px] text-muted">
                {d.category.toUpperCase()} · {d.original_name} · {size(d.size)}
                {staff && (d.client_email ? ` · ${d.client_email}` : "")}
                {staff && ` · ${d.shared_with_client ? "shared with client" : "private"}`}
              </p>
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => download(d.id)} className="font-medium text-brand hover:underline">
                Download
              </button>
              {staff && (
                <>
                  <button type="button" onClick={() => toggleShare(d)} className="text-muted hover:text-ink">
                    {d.shared_with_client ? "Unshare" : "Share"}
                  </button>
                  <button type="button" onClick={() => remove(d.id)} className="text-muted hover:text-red-400">
                    Remove
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {staff && (
        <form onSubmit={upload} className="space-y-3 rounded-xl border border-line bg-surface p-5 text-sm">
          <h3 className="font-semibold">Upload a document</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              Title
              <input name="title" required maxLength={200} className={select} />
            </label>
            <label>
              Type
              <select name="category" defaultValue="agreement" className={select}>
                {CATEGORIES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            File (PDF, DOCX, XLSX, PNG, JPG, WEBP, up to 20 MB)
            <input
              name="file"
              type="file"
              required
              accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp"
              className="mt-2 block w-full text-sm text-muted file:mr-3 file:rounded-md file:border file:border-line file:bg-surface file:px-3 file:py-2 file:text-ink"
            />
          </label>
          {!projectId && (
            <label className="block">
              Project (optional)
              <select name="project" defaultValue="" className={select}>
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} — {p.client_email}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex items-center gap-2">
            <input name="shared_with_client" type="checkbox" value="true" />
            Share with the client of the project{projectId ? "" : " (needs a project)"}
          </label>
          <button
            disabled={busy}
            className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
        </form>
      )}
    </div>
  );
}
