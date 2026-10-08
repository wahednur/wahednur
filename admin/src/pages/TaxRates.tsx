import { useState } from "react";
import { Badge, Button, Card, Empty, field, Loading, Notice, Table, Td, useLoad } from "@/components/ui";
import { api } from "@/lib/http";
import type { TaxRate } from "@/lib/types";

/** The sales taxes that can be picked on a quote or invoice. Old documents keep the rate they were made with. */
export default function TaxRates() {
  const { data, error, reload } = useLoad<TaxRate[]>("/billing/taxes/");
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function save(e: React.FormEvent<HTMLFormElement>, t?: TaxRate) {
    e.preventDefault();
    setMsg("");
    const f = new FormData(e.currentTarget);
    const body = { name: String(f.get("name")), rate: String(f.get("rate")), active: f.get("active") === "on", position: Number(f.get("position") || 0) };
    const r = await (t ? api("PUT", `/billing/taxes/${t.id}/`, body) : api("POST", "/billing/taxes/", body));
    if (!r.ok) return setMsg(r.error);
    setEditing(null);
    reload();
  }
  const form = (t?: TaxRate) => (
    <form onSubmit={(e) => save(e, t)} className="mb-4 grid gap-3 rounded-2xl border border-brand/40 bg-surface p-5 sm:grid-cols-4">
      <label className="text-sm sm:col-span-2">Name (for example VAT)<input name="name" required maxLength={40} defaultValue={t?.name} className={field} /></label>
      <label className="text-sm">Rate (%)<input name="rate" required inputMode="decimal" defaultValue={t?.rate} className={field} /></label>
      <label className="text-sm">Order<input name="position" type="number" defaultValue={t?.position ?? 0} className={field} /></label>
      <label className="flex items-center gap-2 text-sm sm:col-span-4"><input name="active" type="checkbox" defaultChecked={t?.active ?? true} /> Available on new documents</label>
      <div className="flex gap-2 sm:col-span-4"><Button tone="brand" type="submit">Save</Button><Button type="button" onClick={() => setEditing(null)}>Cancel</Button></div>
    </form>
  );

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="text-sm text-muted">Add the taxes you charge. Check the correct rates with your accountant; the app does not guess them.</p>
        <Button tone="brand" onClick={() => setEditing(editing === "new" ? null : "new")}>New tax rate</Button>
      </div>
      {msg && <div className="mb-4"><Notice>{msg}</Notice></div>}
      {editing === "new" && form()}
      {error && <Notice>{error}</Notice>}
      {!data && !error ? <Loading /> : (data ?? []).length === 0 && editing !== "new" ? <Empty>No tax rates yet. Documents are made without tax until you add one.</Empty> : (
        <Table head={["Name", "Rate", "Status", ""]}>
          {(data ?? []).map((t) => editing === String(t.id) ? (
            <tr key={t.id}><td colSpan={4} className="p-4">{form(t)}</td></tr>
          ) : (
            <tr key={t.id}>
              <Td className="font-medium">{t.name}</Td>
              <Td>{Number(t.rate)}%</Td>
              <Td><Badge value={t.active ? "active" : "hidden"} /></Td>
              <Td>
                <div className="flex gap-1.5">
                  <Button small onClick={() => setEditing(String(t.id))}>Edit</Button>
                  <Button small tone="danger" onClick={async () => { if (!confirm(`Delete "${t.name}"? Existing documents keep their rate.`)) return; const r = await api("DELETE", `/billing/taxes/${t.id}/`); if (!r.ok) setMsg(r.error); reload(); }}>Delete</Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Card className="mt-4 p-4 text-xs text-muted">Tax is worked out on the amount left after the discount and shown on its own line.</Card>
    </>
  );
}
