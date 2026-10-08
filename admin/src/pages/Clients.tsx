import { Fragment, useMemo, useState } from "react";
import { Badge, Button, Card, Empty, field, Loading, Notice, PageHeader, Search, Table, Td, useLoad } from "@/components/ui";
import { api } from "@/lib/http";
import type { ClientRow } from "@/lib/types";

const TYPES: [ClientRow["client_type"], string, string][] = [
  ["local", "Local client", "billed in BDT (taka)"],
  ["foreign", "Foreign client", "billed in USD (dollars)"],
];

function TypePicker({ value, onChange }: { value: ClientRow["client_type"]; onChange: (v: ClientRow["client_type"]) => void }) {
  return (
    <fieldset className="sm:col-span-2">
      <legend className="text-sm">Client type</legend>
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        {TYPES.map(([v, label, hint]) => (
          <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${value === v ? "border-brand bg-brand/10" : "border-line"}`}>
            <input type="radio" name="client_type" checked={value === v} onChange={() => onChange(v)} />
            <span>{label}<span className="block text-xs text-muted">{hint}</span></span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Fields({ c }: { c?: ClientRow }) {
  return (
    <>
      <label className="text-sm">Name<input name="full_name" maxLength={150} defaultValue={c?.full_name} className={field} /></label>
      <label className="text-sm">Company<input name="company" maxLength={150} defaultValue={c?.company} className={field} /></label>
      <label className="text-sm">Phone<input name="phone" maxLength={30} defaultValue={c?.phone} className={field} /></label>
      <label className="text-sm">Address<input name="address" maxLength={300} defaultValue={c?.address} className={field} /></label>
    </>
  );
}
const read = (f: FormData, keys: string[]) => Object.fromEntries(keys.map((k) => [k, String(f.get(k) ?? "")]));
const KEYS = ["full_name", "company", "phone", "address"];

export default function Clients() {
  const { data, error, reload } = useLoad<ClientRow[]>("/clients/");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [type, setType] = useState<ClientRow["client_type"]>("local");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");

  const rows = useMemo(
    () => (data ?? []).filter((c) => `${c.email} ${c.full_name} ${c.company}`.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    setOk("");
    const f = new FormData(e.currentTarget);
    const r = await api("POST", "/clients/", { email: String(f.get("email")), client_type: type, ...read(f, KEYS) });
    if (!r.ok) return setMsg(r.error);
    setOk("Client created. We emailed them how to choose their own password.");
    setAdding(false);
    reload();
  }
  async function save(e: React.FormEvent<HTMLFormElement>, c: ClientRow) {
    e.preventDefault();
    setMsg("");
    setOk("");
    const f = new FormData(e.currentTarget);
    const r = await api("PATCH", `/clients/${c.id}/`, { client_type: type, ...read(f, [...KEYS, "internal_notes"]) });
    if (!r.ok) return setMsg(r.error);
    setEditing(null);
    reload();
  }
  async function invite(c: ClientRow) {
    setMsg("");
    setOk("");
    const r = await api("POST", `/clients/${c.id}/`, {});
    r.ok ? setOk(`Invitation sent again to ${c.email}.`) : setMsg(r.error);
  }

  return (
    <>
      <PageHeader
        title="Clients"
        intro="Local clients are billed in BDT, foreign clients in USD. The client chooses their own password."
        action={<Button tone="brand" onClick={() => { setAdding((v) => !v); setType("local"); }}>{adding ? "Close" : "New client"}</Button>}
      />
      {msg && <div className="mb-4"><Notice>{msg}</Notice></div>}
      {ok && <div className="mb-4"><Notice kind="ok">{ok}</Notice></div>}

      {adding && (
        <form onSubmit={create} className="mb-6 grid gap-3 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">Email (they sign in with this)<input name="email" type="email" required maxLength={254} className={field} /></label>
          <TypePicker value={type} onChange={setType} />
          <Fields />
          <p className="text-xs text-muted sm:col-span-2">We email the client how to choose a password. You never see or set it.</p>
          <div className="sm:col-span-2"><Button tone="brand" type="submit">Create client and send invitation</Button></div>
        </form>
      )}

      <div className="mb-4"><Search value={q} onChange={setQ} placeholder="Search name, company or email" /></div>
      {error && <Notice>{error}</Notice>}
      {!data && !error ? <Loading /> : rows.length === 0 ? <Empty>No clients match.</Empty> : (
        <Table head={["Name", "Type", "Email", "Phone", ""]}>
          {rows.map((c) => (
            <Fragment key={c.id}>
              <tr>
                <Td><div className="font-medium">{c.full_name || "—"}</div><div className="text-xs text-muted">{c.company}</div></Td>
                <Td><Badge value={c.client_type} /><span className="ml-2 font-mono text-xs text-muted">{c.currency}</span></Td>
                <Td>{c.email}</Td>
                <Td className="text-muted">{c.phone || "—"}</Td>
                <Td>
                  <div className="flex gap-1.5">
                    <Button small onClick={() => { setEditing(editing === c.id ? null : c.id); setType(c.client_type); }}>Edit</Button>
                    <Button small onClick={() => invite(c)}>Send invitation</Button>
                  </div>
                </Td>
              </tr>
              {editing === c.id && (
                <tr>
                  <td colSpan={5} className="bg-bg/40 p-4">
                    <Card className="p-5">
                      <form onSubmit={(e) => save(e, c)} className="grid gap-3 sm:grid-cols-2">
                        <TypePicker value={type} onChange={setType} />
                        <Fields c={c} />
                        <label className="text-sm sm:col-span-2">Private notes (never shown to the client)
                          <textarea name="internal_notes" rows={3} defaultValue={c.internal_notes} className={field} />
                        </label>
                        <div className="flex gap-2 sm:col-span-2">
                          <Button tone="brand" type="submit">Save</Button>
                          <Button type="button" onClick={() => setEditing(null)}>Cancel</Button>
                        </div>
                      </form>
                    </Card>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </Table>
      )}
    </>
  );
}
