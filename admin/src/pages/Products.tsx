import { useState } from "react";
import { Badge, Button, Card, Empty, field, Loading, Notice, PageHeader, Table, Tabs, Td, useLoad } from "@/components/ui";
import { money } from "@/lib/format";
import { api } from "@/lib/http";
import type { ShopProduct, VaultDoc, Zone } from "@/lib/types";

const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);

export default function Products() {
  const [tab, setTab] = useState("products");
  return (
    <>
      <PageHeader title="Products and delivery" intro="What the shop sells. Orders are on the Shop orders page." />
      <Tabs tabs={[["products", "Products"], ["zones", "Delivery areas"]]} value={tab} onChange={setTab} />
      {tab === "products" ? <ProductList /> : <ZoneList />}
    </>
  );
}

function ProductList() {
  const { data, error, reload } = useLoad<ShopProduct[]>("/manage/products/");
  const docs = useLoad<VaultDoc[]>("/documents/");
  const [editing, setEditing] = useState<string | null>(null); // "new" or product id
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");

  async function run(promise: Promise<{ ok: boolean; error: string }>, done: string, close = false) {
    setMsg("");
    setOk("");
    const r = await promise;
    if (!r.ok) return setMsg(r.error);
    setOk(done);
    if (close) setEditing(null);
    reload();
  }

  async function save(e: React.FormEvent<HTMLFormElement>, p?: ShopProduct) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    let image = String(f.get("image_url") ?? "");
    const photo = f.get("photo");
    if (photo instanceof File && photo.size > 0) {
      const up = new FormData();
      up.set("file", photo);
      const r = await api<{ url: string }>("POST", "/shop/images/", up);
      if (!r.ok || !r.data) return setMsg(r.error);
      image = r.data.url;
    }
    const body = {
      title: String(f.get("title")),
      slug: String(f.get("slug")) || slugify(String(f.get("title"))),
      summary: String(f.get("summary")),
      description: String(f.get("description")),
      ...(p ? {} : { kind: String(f.get("kind")) }),
      price: String(f.get("price")),
      currency: String(f.get("currency")),
      image_url: image,
      position: Number(f.get("position") || 0),
      published: f.get("published") === "on",
    };
    return run(p ? api("PUT", `/manage/products/${p.id}/`, body) : api("POST", "/manage/products/", body), "Product saved.", true);
  }

  async function stock(e: React.FormEvent<HTMLFormElement>, p: ShopProduct) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    await run(
      api("POST", `/manage/products/${p.id}/stock/`, { delta: Number(f.get("delta")), reason: String(f.get("reason")), note: String(f.get("note") ?? "") }),
      "Stock updated.",
    );
    form.reset();
  }

  return (
    <>
      <div className="mb-4 flex justify-end"><Button tone="brand" onClick={() => setEditing(editing === "new" ? null : "new")}>New product</Button></div>
      {msg && <div className="mb-4"><Notice>{msg}</Notice></div>}
      {ok && <div className="mb-4"><Notice kind="ok">{ok}</Notice></div>}
      {editing === "new" && <ProductForm onSubmit={(e) => save(e)} onCancel={() => setEditing(null)} />}
      {error && <Notice>{error}</Notice>}
      {!data && !error ? <Loading /> : (data ?? []).length === 0 && editing !== "new" ? <Empty>No products yet. Add your first one.</Empty> : (
        <div className="space-y-4">
          {(data ?? []).map((p) => (
            <Card key={p.id} className="p-5">
              {editing === String(p.id) ? (
                <ProductForm p={p} onSubmit={(e) => save(e, p)} onCancel={() => setEditing(null)} />
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex gap-4">
                      {p.image_url && <img src={p.image_url} alt="" className="h-16 w-16 rounded-lg border border-line object-cover" />}
                      <div>
                        <p className="font-medium">{p.title}</p>
                        <p className="text-sm text-muted">{p.summary}</p>
                        <p className="mt-1 text-lg font-semibold">{money(p.currency, p.price)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge value={p.kind} />
                      <Badge value={p.published ? "published" : "hidden"} />
                      <Button small onClick={() => setEditing(String(p.id))}>Edit</Button>
                      <Button small tone="danger" onClick={() => confirm(`Delete "${p.title}"?`) && run(api("DELETE", `/manage/products/${p.id}/`), "Product deleted.")}>Delete</Button>
                    </div>
                  </div>
                  {p.kind === "physical" ? (
                    <div className="mt-4 border-t border-line pt-4 text-sm">
                      <p>In stock: <span className="font-semibold">{p.stock}</span> <span className="text-xs text-muted">(every change is a recorded movement; the number can never go below zero)</span></p>
                      <form onSubmit={(e) => stock(e, p)} className="mt-2 grid gap-2 sm:grid-cols-[7rem_10rem_1fr_auto]">
                        <input name="delta" type="number" required aria-label="Change" placeholder="+10 or -2" className={`${field} mt-0`} />
                        <select name="reason" aria-label="Reason" className={`${field} mt-0`}><option value="restock">Restock</option><option value="adjustment">Count correction</option></select>
                        <input name="note" maxLength={200} aria-label="Note" placeholder="Note (optional)" className={`${field} mt-0`} />
                        <Button type="submit">Update stock</Button>
                      </form>
                    </div>
                  ) : (
                    <div className="mt-4 border-t border-line pt-4 text-sm">
                      <p className="mb-2">Files the buyer downloads after paying {p.files.length === 0 && <span className="text-amber-200">(none yet, so it cannot be published)</span>}</p>
                      <ul className="mb-2 space-y-1">
                        {p.files.map((f) => (
                          <li key={f.document} className="flex items-center justify-between gap-2">
                            <span>{f.title} <span className="font-mono text-[11px] text-muted">{f.name}</span></span>
                            <Button small tone="danger" onClick={() => run(api("DELETE", `/manage/products/${p.id}/files/${f.document}/`), "File removed.")}>Remove</Button>
                          </li>
                        ))}
                      </ul>
                      <form onSubmit={(e) => { e.preventDefault(); const d = String(new FormData(e.currentTarget).get("document")); if (d) void run(api("POST", `/manage/products/${p.id}/files/`, { document: d }), "File attached."); }} className="flex gap-2">
                        <select name="document" aria-label="Document" className={`${field} mt-0`}>
                          <option value="">Choose a file from Documents…</option>
                          {(docs.data ?? []).filter((d) => !p.files.some((f) => f.document === d.id)).map((d) => <option key={d.id} value={d.id}>{d.title} ({d.original_name})</option>)}
                        </select>
                        <Button type="submit">Attach</Button>
                      </form>
                    </div>
                  )}
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function ProductForm({ p, onSubmit, onCancel }: { p?: ShopProduct; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return (
    <form onSubmit={onSubmit} className="mb-4 grid gap-3 rounded-2xl border border-brand/40 bg-surface p-5 sm:grid-cols-2">
      <label className="text-sm">Title<input name="title" required maxLength={200} defaultValue={p?.title} className={field} /></label>
      <label className="text-sm">Address (optional)<input name="slug" maxLength={120} defaultValue={p?.slug} className={field} /></label>
      <label className="text-sm">Type
        <select name="kind" defaultValue={p?.kind ?? "digital"} disabled={!!p} className={field}>
          <option value="digital">Digital (download after payment)</option>
          <option value="physical">Physical (stock and delivery)</option>
        </select>
        {p && <span className="mt-1 block text-xs text-muted">A product's type cannot change.</span>}
      </label>
      <label className="text-sm">Order on page<input name="position" type="number" defaultValue={p?.position ?? 0} className={field} /></label>
      <label className="text-sm">Price<input name="price" required inputMode="decimal" defaultValue={p?.price} className={field} /></label>
      <label className="text-sm">Currency
        <select name="currency" defaultValue={p?.currency ?? "BDT"} className={field}><option value="BDT">BDT</option><option value="USD">USD</option></select>
      </label>
      <label className="text-sm sm:col-span-2">One-line summary<input name="summary" maxLength={300} defaultValue={p?.summary} className={field} /></label>
      <label className="text-sm sm:col-span-2">Description<textarea name="description" rows={4} defaultValue={p?.description} className={field} /></label>
      <label className="text-sm">Photo (PNG, JPG or WEBP, up to 5 MB)<input name="photo" type="file" accept="image/png,image/jpeg,image/webp" className={field} /></label>
      <label className="text-sm">…or a photo address<input name="image_url" defaultValue={p?.image_url} className={field} /></label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input name="published" type="checkbox" defaultChecked={p?.published ?? false} /> Visible in the shop (a download product needs a file first)</label>
      <div className="flex gap-2 sm:col-span-2"><Button tone="brand" type="submit">Save product</Button><Button type="button" onClick={onCancel}>Cancel</Button></div>
    </form>
  );
}

function ZoneList() {
  const { data, error, reload } = useLoad<Zone[]>("/manage/zones/");
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function save(e: React.FormEvent<HTMLFormElement>, z?: Zone) {
    e.preventDefault();
    setMsg("");
    const f = new FormData(e.currentTarget);
    const body = { name: String(f.get("name")), fee: String(f.get("fee")), currency: String(f.get("currency")), position: Number(f.get("position") || 0), active: f.get("active") === "on" };
    const r = await (z ? api("PUT", `/manage/zones/${z.id}/`, body) : api("POST", "/manage/zones/", body));
    if (!r.ok) return setMsg(r.error);
    setEditing(null);
    reload();
  }
  const form = (z?: Zone) => (
    <form onSubmit={(e) => save(e, z)} className="mb-4 grid gap-3 rounded-2xl border border-brand/40 bg-surface p-5 sm:grid-cols-5">
      <label className="text-sm sm:col-span-2">Area (for example Dhaka city)<input name="name" required maxLength={80} defaultValue={z?.name} className={field} /></label>
      <label className="text-sm">Delivery fee<input name="fee" required inputMode="decimal" defaultValue={z?.fee} className={field} /></label>
      <label className="text-sm">Currency<select name="currency" defaultValue={z?.currency ?? "BDT"} className={field}><option value="BDT">BDT</option><option value="USD">USD</option></select></label>
      <label className="text-sm">Order<input name="position" type="number" defaultValue={z?.position ?? 0} className={field} /></label>
      <label className="flex items-center gap-2 text-sm sm:col-span-5"><input name="active" type="checkbox" defaultChecked={z?.active ?? true} /> Offered to customers</label>
      <div className="flex gap-2 sm:col-span-5"><Button tone="brand" type="submit">Save</Button><Button type="button" onClick={() => setEditing(null)}>Cancel</Button></div>
    </form>
  );

  return (
    <>
      <div className="mb-4 flex justify-end"><Button tone="brand" onClick={() => setEditing(editing === "new" ? null : "new")}>New delivery area</Button></div>
      {msg && <div className="mb-4"><Notice>{msg}</Notice></div>}
      {editing === "new" && form()}
      {error && <Notice>{error}</Notice>}
      {!data && !error ? <Loading /> : (data ?? []).length === 0 && editing !== "new" ? <Empty>No delivery areas yet. A physical product needs at least one.</Empty> : (
        <Table head={["Area", "Fee", "Offered", ""]}>
          {(data ?? []).map((z) => editing === String(z.id) ? (
            <tr key={z.id}><td colSpan={4} className="p-4">{form(z)}</td></tr>
          ) : (
            <tr key={z.id}>
              <Td className="font-medium">{z.name}</Td>
              <Td>{money(z.currency, z.fee)}</Td>
              <Td><Badge value={z.active ? "active" : "hidden"} /></Td>
              <Td>
                <div className="flex gap-1.5">
                  <Button small onClick={() => setEditing(String(z.id))}>Edit</Button>
                  <Button small tone="danger" onClick={async () => { if (!confirm(`Delete "${z.name}"?`)) return; const r = await api("DELETE", `/manage/zones/${z.id}/`); if (!r.ok) setMsg(r.error); reload(); }}>Delete</Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
