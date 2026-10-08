import { useMemo, useState } from "react";
import { Badge, Button, Empty, field, Loading, Notice, PageHeader, Search, Table, Td, useLoad } from "@/components/ui";
import { day } from "@/lib/format";
import { api } from "@/lib/http";
import type { ClientRow, Project } from "@/lib/types";

const NEXT: Record<Project["status"], Project["status"][]> = {
  proposal: ["active", "cancelled"],
  active: ["on_hold", "completed", "cancelled"],
  on_hold: ["active", "cancelled"],
  completed: ["active"],
  cancelled: [],
};
const LABEL: Record<Project["status"], string> = {
  proposal: "Proposal",
  active: "In progress",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function Projects() {
  const { data, error, reload } = useLoad<Project[]>("/projects/");
  const clients = useLoad<ClientRow[]>("/clients/");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [msg, setMsg] = useState("");
  const [adding, setAdding] = useState(false);

  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (p) =>
          (filter === "all" || p.status === filter) &&
          `${p.title} ${p.client_email}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [data, q, filter],
  );

  async function move(p: Project, status: Project["status"]) {
    setMsg("");
    const r = await api("PATCH", `/projects/${p.id}/`, { status });
    if (!r.ok) setMsg(r.error);
    reload();
  }

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    const f = new FormData(e.currentTarget);
    const r = await api("POST", "/projects/", {
      title: String(f.get("title")),
      client: Number(f.get("client")),
      summary: String(f.get("summary") ?? ""),
    });
    if (!r.ok) return setMsg(r.error);
    setAdding(false);
    reload();
  }

  return (
    <>
      <PageHeader
        title="Projects"
        intro="Status changes follow the allowed steps; the server refuses anything else."
        action={<Button tone="brand" onClick={() => setAdding((v) => !v)}>{adding ? "Close" : "New project"}</Button>}
      />
      {msg && <div className="mb-4"><Notice>{msg}</Notice></div>}
      {adding && (
        <form onSubmit={create} className="mb-6 grid gap-3 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2">
          <label className="text-sm">
            Title
            <input name="title" required maxLength={200} className={field} />
          </label>
          <label className="text-sm">
            Client
            <select name="client" required className={field}>
              <option value="">Choose…</option>
              {(clients.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name || c.email} ({c.email})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            Summary (optional)
            <input name="summary" maxLength={500} className={field} />
          </label>
          <div className="sm:col-span-2"><Button tone="brand" type="submit">Create project</Button></div>
        </form>
      )}
      <div className="mb-4 flex flex-wrap gap-3">
        <Search value={q} onChange={setQ} placeholder="Search title or client" />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status" className={`${field} mt-0 w-auto`}>
          <option value="all">All statuses</option>
          {Object.entries(LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      {error && <Notice>{error}</Notice>}
      {!data && !error ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>No projects match.</Empty>
      ) : (
        <Table head={["Project", "Client", "Status", "Progress", "Due", "Move to"]}>
          {rows.map((p) => (
            <tr key={p.id}>
              <Td className="font-medium">{p.title}</Td>
              <Td className="text-muted">{p.client_email}</Td>
              <Td><Badge value={p.status} /></Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-brand" style={{ width: `${p.progress}%` }} />
                  </div>
                  <span className="font-mono text-xs text-muted">{p.progress}%</span>
                </div>
              </Td>
              <Td className="font-mono text-xs text-muted">{day(p.due_date)}</Td>
              <Td>
                <div className="flex flex-wrap gap-1.5">
                  {NEXT[p.status].map((s) => (
                    <Button key={s} small tone={s === "cancelled" ? "danger" : "plain"} onClick={() => move(p, s)}>
                      {LABEL[s]}
                    </Button>
                  ))}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
