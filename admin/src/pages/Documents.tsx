import { useMemo, useState } from "react";
import { Badge, Button, Card, Empty, field, Loading, Notice, PageHeader, Search, Table, Td, useLoad } from "@/components/ui";
import { day } from "@/lib/format";
import { api, openDocument } from "@/lib/http";
import type { ClientRow, Project, VaultDoc } from "@/lib/types";

const CATEGORIES: [string, string][] = [
  ["mou", "MOU"],
  ["tor", "Terms of reference (TOR)"],
  ["agreement", "Agreement"],
  ["quotation", "Quotation"],
  ["invoice", "Invoice"],
  ["receipt", "Receipt"],
  ["other", "Other"],
];
const size = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default function Documents() {
  const { data, error, reload } = useLoad<VaultDoc[]>("/documents/");
  const clients = useLoad<ClientRow[]>("/clients/");
  const projects = useLoad<Project[]>("/projects/");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [client, setClient] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const rows = useMemo(
    () => (data ?? []).filter((d) => `${d.title} ${d.original_name} ${d.client_email ?? ""}`.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );
  const clientProjects = (projects.data ?? []).filter((p) => String(p.client) === client);

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setOk("");
    const f = new FormData(e.currentTarget);
    if (!f.get("client")) f.delete("client");
    if (!f.get("project")) f.delete("project");
    f.set("shared_with_client", f.get("shared_with_client") === "on" ? "true" : "false");
    const r = await api("POST", "/documents/", f);
    setBusy(false);
    if (!r.ok) return setMsg(r.error);
    setOk("Uploaded.");
    setAdding(false);
    reload();
  }
  async function run(promise: Promise<{ ok: boolean; error: string }>, done: string) {
    setMsg("");
    setOk("");
    const r = await promise;
    if (!r.ok) return setMsg(r.error);
    setOk(done);
    reload();
  }

  return (
    <>
      <PageHeader
        title="Documents"
        intro="Private files: contracts, TORs, receipts. A client sees a file only after you share it with them."
        action={<Button tone="brand" onClick={() => setAdding((v) => !v)}>{adding ? "Close" : "Upload a file"}</Button>}
      />
      {msg && <div className="mb-4"><Notice>{msg}</Notice></div>}
      {ok && <div className="mb-4"><Notice kind="ok">{ok}</Notice></div>}

      {adding && (
        <form onSubmit={upload} className="mb-6 grid gap-3 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">File (PDF, images, Office files; the server checks type and size)
            <input name="file" type="file" required className={field} />
          </label>
          <label className="text-sm">Title<input name="title" required maxLength={200} className={field} /></label>
          <label className="text-sm">Kind
            <select name="category" defaultValue="other" className={field}>{CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          <label className="text-sm">Client
            <select name="client" value={client} onChange={(e) => setClient(e.target.value)} className={field}>
              <option value="">Nobody yet (private to you)</option>
              {(clients.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.full_name || c.email} ({c.email})</option>)}
            </select>
          </label>
          <label className="text-sm">Project (optional)
            <select name="project" className={field} disabled={!client}>
              <option value="">None</option>
              {clientProjects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input name="shared_with_client" type="checkbox" disabled={!client} /> Share with this client now</label>
          <div className="sm:col-span-2"><Button tone="brand" type="submit" disabled={busy}>{busy ? "Uploading…" : "Upload"}</Button></div>
        </form>
      )}

      <div className="mb-4"><Search value={q} onChange={setQ} placeholder="Search title, file or client" /></div>
      {error && <Notice>{error}</Notice>}
      {!data && !error ? <Loading /> : rows.length === 0 ? <Empty>No documents yet.</Empty> : (
        <Table head={["Document", "Client", "Kind", "Sharing", "Added", ""]}>
          {rows.map((d) => (
            <tr key={d.id}>
              <Td><div className="font-medium">{d.title}</div><div className="font-mono text-[11px] text-muted">{d.original_name} · {size(d.size)}</div></Td>
              <Td className="text-muted">{d.client_email ?? "—"}</Td>
              <Td className="text-muted">{CATEGORIES.find((c) => c[0] === d.category)?.[1] ?? d.category}</Td>
              <Td><Badge value={d.shared_with_client ? "shared" : "private"} /></Td>
              <Td className="font-mono text-xs text-muted">{day(d.created_at)}</Td>
              <Td>
                <div className="flex flex-wrap gap-1.5">
                  <Button small onClick={async () => setMsg(await openDocument(d.id, d.original_name))}>Download</Button>
                  <Button small disabled={!d.client && !d.shared_with_client} onClick={() => run(api("PATCH", `/documents/${d.id}/`, { shared_with_client: !d.shared_with_client }), d.shared_with_client ? "No longer shared." : "Shared with the client.")}>
                    {d.shared_with_client ? "Stop sharing" : "Share"}
                  </Button>
                  <Button small tone="danger" onClick={() => confirm(`Delete "${d.title}"?`) && run(api("DELETE", `/documents/${d.id}/`), "Deleted.")}>Delete</Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Card className="mt-4 p-4 text-xs text-muted">Files are stored privately and every download uses a short-lived link. Deleting removes the file from view; the action is kept in the audit trail.</Card>
    </>
  );
}
