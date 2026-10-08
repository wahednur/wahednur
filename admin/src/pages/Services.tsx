import { useState } from "react";
import { Badge, Button, Card, Empty, field, Loading, Notice, PageHeader, useLoad } from "@/components/ui";
import { money } from "@/lib/format";
import { api } from "@/lib/http";
import type { ManagedPackage, ManagedService } from "@/lib/types";

const CYCLES: [ManagedPackage["cycle"], string][] = [
  ["one_time", "One time"],
  ["monthly", "Monthly"],
  ["yearly", "Yearly"],
];
const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
const num = (v: FormDataEntryValue | null) => (String(v ?? "").trim() === "" ? null : Number(v));

export default function Services() {
  const { data, error, reload } = useLoad<ManagedService[]>("/manage/services/");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // "s:ID", "p:ID", "newp:SERVICE", "news"

  async function run(promise: Promise<{ ok: boolean; error: string }>, done: string) {
    setMsg("");
    setOk("");
    const r = await promise;
    if (!r.ok) return setMsg(r.error);
    setOk(done);
    setEditing(null);
    reload();
  }

  const saveService = (e: React.FormEvent<HTMLFormElement>, s?: ManagedService) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      title: String(f.get("title")),
      slug: String(f.get("slug")) || slugify(String(f.get("title"))),
      summary: String(f.get("summary")),
      description: String(f.get("description")),
      position: Number(f.get("position") || 0),
      published: f.get("published") === "on",
    };
    return run(s ? api("PUT", `/manage/services/${s.id}/`, body) : api("POST", "/manage/services/", body), "Service saved.");
  };

  const savePackage = (e: React.FormEvent<HTMLFormElement>, serviceId: number, p?: ManagedPackage) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      name: String(f.get("name")),
      tagline: String(f.get("tagline")),
      features: String(f.get("features")).split("\n").map((x) => x.trim()).filter(Boolean),
      price: String(f.get("price")),
      currency: String(f.get("currency")),
      cycle: String(f.get("cycle")),
      delivery_days: num(f.get("delivery_days")),
      revisions: num(f.get("revisions")),
      position: Number(f.get("position") || 0),
      published: f.get("published") === "on",
    };
    return run(p ? api("PUT", `/manage/packages/${p.id}/`, body) : api("POST", `/manage/services/${serviceId}/packages/`, body), "Package saved.");
  };

  return (
    <>
      <PageHeader
        title="Services and packages"
        intro="Visitors see published services and packages on the Packages page. Hide something instead of deleting it once it has orders."
        action={<Button tone="brand" onClick={() => setEditing(editing === "news" ? null : "news")}>New service</Button>}
      />
      {msg && <div className="mb-4"><Notice>{msg}</Notice></div>}
      {ok && <div className="mb-4"><Notice kind="ok">{ok}</Notice></div>}
      {editing === "news" && <ServiceForm onSubmit={(e) => saveService(e)} onCancel={() => setEditing(null)} />}
      {error && <Notice>{error}</Notice>}
      {!data && !error ? <Loading /> : (data ?? []).length === 0 ? <Empty>No services yet.</Empty> : (
        <div className="space-y-4">
          {(data ?? []).map((s) => (
            <Card key={s.id} className="overflow-hidden">
              <button className="flex w-full items-center justify-between gap-3 p-5 text-left" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id}>
                <span>
                  <span className="font-medium">{s.title}</span>
                  <span className="mt-0.5 block text-sm text-muted">{s.summary}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-muted">{s.packages.length} packages</span>
                  <Badge value={s.published ? "published" : "hidden"} />
                </span>
              </button>
              {open === s.id && (
                <div className="space-y-4 border-t border-line p-5">
                  <div className="flex flex-wrap gap-2">
                    <Button small onClick={() => setEditing(editing === `s:${s.id}` ? null : `s:${s.id}`)}>Edit service</Button>
                    <Button small onClick={() => setEditing(`newp:${s.id}`)}>Add package</Button>
                    <Button small tone="danger" onClick={() => confirm(`Delete "${s.title}"?`) && run(api("DELETE", `/manage/services/${s.id}/`), "Service deleted.")}>Delete</Button>
                  </div>
                  {editing === `s:${s.id}` && <ServiceForm s={s} onSubmit={(e) => saveService(e, s)} onCancel={() => setEditing(null)} />}
                  {editing === `newp:${s.id}` && <PackageForm onSubmit={(e) => savePackage(e, s.id)} onCancel={() => setEditing(null)} />}
                  {s.packages.length === 0 && editing !== `newp:${s.id}` && <p className="text-sm text-muted">No packages yet.</p>}
                  <div className="grid gap-3 lg:grid-cols-3">
                    {s.packages.map((p) =>
                      editing === `p:${p.id}` ? (
                        <div key={p.id} className="lg:col-span-3"><PackageForm p={p} onSubmit={(e) => savePackage(e, s.id, p)} onCancel={() => setEditing(null)} /></div>
                      ) : (
                        <div key={p.id} className="rounded-xl border border-line bg-bg/40 p-4 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium">{p.name}</p>
                            <Badge value={p.published ? "published" : "hidden"} />
                          </div>
                          <p className="mt-1 text-xl font-semibold">{money(p.currency, p.price)}<span className="ml-1 text-xs font-normal text-muted">{CYCLES.find((c) => c[0] === p.cycle)?.[1]}</span></p>
                          {p.tagline && <p className="mt-1 text-muted">{p.tagline}</p>}
                          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-muted">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
                          <p className="mt-2 font-mono text-[11px] text-muted">{p.delivery_days ? `${p.delivery_days} days` : "days not set"} · {p.revisions !== null ? `${p.revisions} revisions` : "revisions not set"}</p>
                          <div className="mt-3 flex gap-2">
                            <Button small onClick={() => setEditing(`p:${p.id}`)}>Edit</Button>
                            <Button small tone="danger" onClick={() => confirm(`Delete "${p.name}"?`) && run(api("DELETE", `/manage/packages/${p.id}/`), "Package deleted.")}>Delete</Button>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function ServiceForm({ s, onSubmit, onCancel }: { s?: ManagedService; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return (
    <form onSubmit={onSubmit} className="mb-4 grid gap-3 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2">
      <label className="text-sm">Title<input name="title" required maxLength={200} defaultValue={s?.title} className={field} /></label>
      <label className="text-sm">Address (slug, optional)<input name="slug" maxLength={120} defaultValue={s?.slug} className={field} /></label>
      <label className="text-sm sm:col-span-2">Short summary<input name="summary" maxLength={300} defaultValue={s?.summary} className={field} /></label>
      <label className="text-sm sm:col-span-2">Description<textarea name="description" rows={3} defaultValue={s?.description} className={field} /></label>
      <label className="text-sm">Order on page<input name="position" type="number" defaultValue={s?.position ?? 0} className={field} /></label>
      <label className="flex items-center gap-2 text-sm"><input name="published" type="checkbox" defaultChecked={s?.published ?? false} /> Visible on the Packages page</label>
      <div className="flex gap-2 sm:col-span-2"><Button tone="brand" type="submit">Save service</Button><Button type="button" onClick={onCancel}>Cancel</Button></div>
    </form>
  );
}

function PackageForm({ p, onSubmit, onCancel }: { p?: ManagedPackage; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-brand/40 bg-surface p-5 sm:grid-cols-3">
      <label className="text-sm">Name (Basic, Standard…)<input name="name" required maxLength={80} defaultValue={p?.name} className={field} /></label>
      <label className="text-sm sm:col-span-2">One-line promise<input name="tagline" maxLength={160} defaultValue={p?.tagline} className={field} /></label>
      <label className="text-sm sm:col-span-3">What is included (one per line, up to 12)
        <textarea name="features" rows={5} defaultValue={p?.features.join("\n")} className={field} />
      </label>
      <label className="text-sm">Price<input name="price" required inputMode="decimal" defaultValue={p?.price} className={field} /></label>
      <label className="text-sm">Currency
        <select name="currency" defaultValue={p?.currency ?? "USD"} className={field}><option value="USD">USD (foreign clients)</option><option value="BDT">BDT (local clients)</option></select>
      </label>
      <label className="text-sm">Billing
        <select name="cycle" defaultValue={p?.cycle ?? "one_time"} className={field}>{CYCLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </label>
      <label className="text-sm">Delivery (days)<input name="delivery_days" type="number" min={1} defaultValue={p?.delivery_days ?? ""} className={field} /></label>
      <label className="text-sm">Revisions<input name="revisions" type="number" min={0} defaultValue={p?.revisions ?? ""} className={field} /></label>
      <label className="text-sm">Order<input name="position" type="number" defaultValue={p?.position ?? 0} className={field} /></label>
      <label className="flex items-center gap-2 text-sm sm:col-span-3"><input name="published" type="checkbox" defaultChecked={p?.published ?? false} /> Visible on the Packages page</label>
      <p className="text-xs text-muted sm:col-span-3">A local client can only order a BDT package and a foreign client a USD package, so keep a separate package for each currency.</p>
      <div className="flex gap-2 sm:col-span-3"><Button tone="brand" type="submit">Save package</Button><Button type="button" onClick={onCancel}>Cancel</Button></div>
    </form>
  );
}
