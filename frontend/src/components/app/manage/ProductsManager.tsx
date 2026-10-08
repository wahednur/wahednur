"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/auth/ui";
import { btn, field as input, ghost } from "@/components/app/billing/Bits";
import { api, type Doc, type ManagedProduct, type StockRow } from "@/lib/api";
import Form, { type Field } from "./Form";

const FIELDS = (existing: boolean): Field[] => [
  { name: "title", label: "Name", required: true },
  { name: "slug", label: "Address (letters, numbers, dashes)", required: true },
  { name: "kind", label: "Type", type: "select", disabled: existing, options: [["physical", "Delivered to the buyer"], ["digital", "Download (file)"]], hint: existing ? "The type cannot change after creation." : undefined },
  { name: "price", label: "Price", type: "number", step: "0.01", required: true },
  { name: "currency", label: "Currency", type: "select", options: [["BDT", "BDT (৳)"], ["USD", "USD ($)"]] },
  { name: "position", label: "Order (small first)", type: "number" },
  { name: "summary", label: "One-line summary", wide: true },
  { name: "description", label: "Description (Markdown)", type: "textarea" },
  { name: "image_url", label: "Photo", type: "image" },
  { name: "published", label: "Published (visible in the shop)", type: "checkbox" },
];

function StockPanel({ product, onChange }: { product: ManagedProduct; onChange: () => void }) {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    api<StockRow[]>("GET", `/manage/products/${product.id}/stock/`).then((r) => r.ok && setRows(r.data ?? []));
  }, [product.id, tick, product.stock]);
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Stock: {product.stock} in hand</h3>
      {error && <Alert>{error}</Alert>}
      <form
        className="grid gap-3 sm:grid-cols-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          setError("");
          const r = await api("POST", `/manage/products/${product.id}/stock/`, {
            delta: Number(f.get("delta")),
            reason: f.get("reason"),
            note: f.get("note"),
          });
          if (r.ok) {
            form.reset();
            setTick((t) => t + 1);
            onChange();
          } else setError(r.error);
        }}
      >
        <label className="text-sm">
          Units (+ add, − remove)
          <input name="delta" type="number" required className={input} />
        </label>
        <label className="text-sm">
          What happened
          <select name="reason" defaultValue="restock" className={input}>
            <option value="restock">New stock arrived</option>
            <option value="adjustment">Count correction</option>
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          Note (optional)
          <input name="note" maxLength={200} className={input} />
        </label>
        <button className={btn + " sm:col-span-4 sm:w-fit"}>Record</button>
      </form>
      {rows.length > 0 && (
        <ul className="divide-y divide-line rounded-lg border border-line text-xs">
          {rows.map((m) => (
            <li key={m.id} className="flex justify-between gap-3 p-2">
              <span>
                {m.delta > 0 ? "+" : ""}
                {m.delta} · {m.reason}
                {m.note && ` · ${m.note}`}
              </span>
              <span className="font-mono text-muted">{m.at.slice(0, 16).replace("T", " ")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilesPanel({ product, onChange }: { product: ManagedProduct; onChange: () => void }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Doc[]>("GET", "/documents/").then((r) => r.ok && setDocs(r.data ?? []));
  }, []);
  const attached = new Set(product.files.map((f) => f.document));
  async function act(method: string, path: string, body?: unknown) {
    setError("");
    const r = await api(method, path, body);
    if (r.ok) onChange();
    else setError(r.error);
  }
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Files the buyer receives</h3>
      {error && <Alert>{error}</Alert>}
      {product.files.length === 0 && <p className="text-sm text-muted">No file yet. Upload one in Documents first, then attach it here.</p>}
      <ul className="space-y-2 text-sm">
        {product.files.map((f) => (
          <li key={f.document} className="flex items-center justify-between gap-3 rounded-lg border border-line p-2">
            <span>
              {f.title} <span className="font-mono text-[11px] text-muted">{f.name}</span>
            </span>
            <button className="text-muted hover:text-red-400" onClick={() => act("DELETE", `/manage/products/${product.id}/files/${f.document}/`)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-wrap items-end gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const id = new FormData(e.currentTarget).get("document");
          if (id) void act("POST", `/manage/products/${product.id}/files/`, { document: id });
        }}
      >
        <label>
          Attach from your documents
          <select name="document" defaultValue="" className={input}>
            <option value="" disabled>
              Choose a file
            </option>
            {docs.filter((d) => !attached.has(d.id)).map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} ({d.original_name})
              </option>
            ))}
          </select>
        </label>
        <button className={btn}>Attach</button>
      </form>
    </div>
  );
}

export default function ProductsManager() {
  const [products, setProducts] = useState<ManagedProduct[] | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const reload = () => setTick((t) => t + 1);

  useEffect(() => {
    api<ManagedProduct[]>("GET", "/manage/products/").then((r) => (r.ok ? setProducts(r.data) : setError(r.error)));
  }, [tick]);

  const save = (method: string, path: string) => async (payload: Record<string, unknown>) => {
    const r = await api(method, path, payload);
    if (r.ok) reload();
    return r.ok ? "" : r.error;
  };

  return (
    <div className="space-y-8">
      {error && <Alert>{error}</Alert>}
      {products === null && !error && <p className="text-sm text-muted">Loading…</p>}
      {products?.length === 0 && <p className="text-sm text-muted">No products yet.</p>}
      {products?.map((p) => (
        <details key={p.id} className="rounded-xl border border-line">
          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4">
            <span className="font-semibold">{p.title}</span>
            <span className="font-mono text-[11px] text-muted">
              {p.kind === "digital" ? "download" : `stock ${p.stock}`} · {p.price} {p.currency} · {p.published ? "published" : "hidden"}
            </span>
          </summary>
          <div className="space-y-8 border-t border-line p-4">
            <Form fields={FIELDS(true)} initial={p} onSave={save("PUT", `/manage/products/${p.id}/`)} submitLabel="Save product" />
            {p.kind === "physical" ? <StockPanel product={p} onChange={reload} /> : <FilesPanel product={p} onChange={reload} />}
            <button
              className={ghost}
              onClick={async () => {
                if (!window.confirm(`Delete "${p.title}"?`)) return;
                setError("");
                const r = await api("DELETE", `/manage/products/${p.id}/`);
                if (r.ok) reload();
                else setError(r.error);
              }}
            >
              Delete product
            </button>
          </div>
        </details>
      ))}
      <div className="rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-1 font-semibold">Add a product</h2>
        <p className="mb-3 text-xs text-muted">New products start hidden. Add stock or a file, then publish.</p>
        <Form
          key={products?.length ?? 0}
          fields={FIELDS(false)}
          initial={{ kind: "physical", currency: "BDT", position: 0, published: false }}
          onSave={save("POST", "/manage/products/")}
          submitLabel="Add product"
        />
      </div>
    </div>
  );
}
