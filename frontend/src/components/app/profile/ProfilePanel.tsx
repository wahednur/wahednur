"use client";

import { useEffect, useState } from "react";
import { Alert, Field } from "@/components/auth/ui";
import { api } from "@/lib/api";

type Profile = { email: string; full_name: string; phone: string; company: string };
type Address = {
  id: number; kind: "shipping" | "billing"; label: string; name: string; company: string; phone: string;
  line1: string; line2: string; city: string; region: string; postal_code: string; country: string;
  tax_id: string; is_default: boolean;
};
const BLANK: Omit<Address, "id" | "is_default"> = {
  kind: "shipping", label: "", name: "", company: "", phone: "", line1: "", line2: "", city: "",
  region: "", postal_code: "", country: "Bangladesh", tax_id: "",
};

const card = "rounded-2xl border border-line bg-surface p-5 sm:p-6";
const btn = "rounded-md border border-line px-3.5 py-2 text-sm hover:border-brand/60 hover:text-brand disabled:opacity-60";
const primary = "rounded-md bg-brand px-4 py-2 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-60";

function ProfileForm() {
  const [p, setP] = useState<Profile | null>(null);
  const [msg, setMsg] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<Profile>("GET", "/auth/profile/").then((r) => (r.ok ? setP(r.data) : setMsg({ kind: "error", text: r.error })));
  }, []);
  if (!p) return <div className={`${card} h-48 animate-pulse`} aria-busy />;
  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: e.target.value });
  return (
    <form
      className={`${card} space-y-4`}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await api<Profile>("PATCH", "/auth/profile/", { full_name: p.full_name, phone: p.phone, company: p.company });
        setBusy(false);
        setMsg(r.ok ? { kind: "info", text: "Saved." } : { kind: "error", text: r.error });
        if (r.ok && r.data) setP(r.data);
      }}
    >
      <h2 className="font-semibold">Your details</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" value={p.full_name} onChange={set("full_name")} maxLength={150} autoComplete="name" />
        <Field label="Phone" value={p.phone} onChange={set("phone")} maxLength={30} autoComplete="tel" inputMode="tel" />
        <Field label="Company (optional)" value={p.company} onChange={set("company")} maxLength={150} autoComplete="organization" />
        <Field label="Email" value={p.email} readOnly disabled hint="Sign-in address. Contact me to change it." />
      </div>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <button className={primary} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
    </form>
  );
}

function AddressForm({ initial, onDone, onCancel }: { initial: Partial<Address>; onDone: () => void; onCancel: () => void }) {
  const [v, setV] = useState({ ...BLANK, ...initial });
  const [top, setTop] = useState("");
  const [busy, setBusy] = useState(false);
  const f = (k: keyof typeof BLANK) => ({
    value: v[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value }),
  });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setTop("");
    const body = { ...v, is_default: initial.is_default ?? false };
    const r = initial.id ? await api("PATCH", `/auth/addresses/${initial.id}/`, body) : await api("POST", "/auth/addresses/", body);
    setBusy(false);
    if (r.ok) return onDone();
    setTop(r.error);
  }
  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-brand/30 bg-bg/40 p-4">
      <div className="flex gap-2" role="radiogroup" aria-label="Address type">
        {(["shipping", "billing"] as const).map((k) => (
          <button
            key={k} type="button" role="radio" aria-checked={v.kind === k}
            onClick={() => setV({ ...v, kind: k })}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${v.kind === k ? "border-brand bg-brand/10 text-brand" : "border-line text-muted"}`}
          >
            {k === "shipping" ? "Delivery address" : "Billing address"}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Label (optional)" placeholder="Home, Office" maxLength={60} {...f("label")} />
        <Field label="Name on the address" required maxLength={150} autoComplete="name" {...f("name")} />
        <Field label="Company (optional)" maxLength={150} {...f("company")} />
        <Field label="Phone" maxLength={30} inputMode="tel" {...f("phone")} />
        <div className="sm:col-span-2"><Field label="Address line 1" required maxLength={200} autoComplete="address-line1" {...f("line1")} /></div>
        <div className="sm:col-span-2"><Field label="Address line 2 (optional)" maxLength={200} autoComplete="address-line2" {...f("line2")} /></div>
        <Field label="City" required maxLength={100} autoComplete="address-level2" {...f("city")} />
        <Field label="District / state" maxLength={100} autoComplete="address-level1" {...f("region")} />
        <Field label="Postal code" maxLength={20} autoComplete="postal-code" {...f("postal_code")} />
        <Field label="Country" maxLength={80} autoComplete="country-name" {...f("country")} />
        {v.kind === "billing" && <Field label="Tax / VAT / BIN number (optional)" maxLength={60} {...f("tax_id")} />}
      </div>
      {top && <Alert>{top}</Alert>}
      <div className="flex gap-2">
        <button className={primary} disabled={busy}>{busy ? "Saving…" : initial.id ? "Save address" : "Add address"}</button>
        <button type="button" className={btn} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function Addresses() {
  const [list, setList] = useState<Address[] | null>(null);
  const [editing, setEditing] = useState<Partial<Address> | null>(null);
  const [err, setErr] = useState("");
  const load = () => api<Address[]>("GET", "/auth/addresses/").then((r) => (r.ok ? setList(r.data) : setErr(r.error)));
  useEffect(() => {
    void load();
  }, []);

  async function act(promise: Promise<{ ok: boolean; error: string }>) {
    setErr("");
    const r = await promise;
    if (!r.ok) setErr(r.error);
    void load();
  }

  const group = (kind: Address["kind"], title: string) => {
    const items = (list ?? []).filter((a) => a.kind === kind);
    return (
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None saved yet.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {items.map((a) => (
              <li key={a.id} className="rounded-xl border border-line p-4 text-sm">
                <p className="flex items-center justify-between gap-2">
                  <span className="font-medium">{a.label || a.name}</span>
                  {a.is_default && <span className="rounded-full border border-brand/40 px-2 py-0.5 font-mono text-[10px] text-brand">default</span>}
                </p>
                <p className="mt-1.5 leading-6 text-muted">
                  {a.name}{a.company && `, ${a.company}`}<br />
                  {a.line1}{a.line2 && `, ${a.line2}`}<br />
                  {[a.city, a.region, a.postal_code].filter(Boolean).join(", ")}, {a.country}
                  {a.phone && <><br />{a.phone}</>}
                  {a.tax_id && <><br />Tax no. {a.tax_id}</>}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className={btn} onClick={() => setEditing(a)}>Edit</button>
                  {!a.is_default && <button className={btn} onClick={() => act(api("PATCH", `/auth/addresses/${a.id}/`, { is_default: true }))}>Make default</button>}
                  <button className={btn} onClick={() => window.confirm("Delete this address?") && act(api("DELETE", `/auth/addresses/${a.id}/`))}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <section className={`${card} space-y-6`} aria-labelledby="addr">
      <div className="flex items-center justify-between gap-3">
        <h2 id="addr" className="font-semibold">Addresses</h2>
        {!editing && <button className={primary} onClick={() => setEditing({})}>Add address</button>}
      </div>
      {err && <Alert>{err}</Alert>}
      {editing && (
        <AddressForm
          key={editing.id ?? "new"}
          initial={editing}
          onCancel={() => setEditing(null)}
          onDone={() => { setEditing(null); void load(); }}
        />
      )}
      {!list ? <div className="h-24 animate-pulse rounded-xl bg-bg/40" aria-busy /> : (
        <>
          {group("shipping", "Delivery addresses")}
          {group("billing", "Billing addresses")}
        </>
      )}
    </section>
  );
}

export default function ProfilePanel() {
  return (
    <div className="space-y-6">
      <ProfileForm />
      <Addresses />
    </div>
  );
}
