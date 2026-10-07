"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/auth/ui";
import { btn, field } from "@/components/app/billing/Bits";
import { api, fmt, type ShopOrderOut, type ShopProduct, type Zone } from "@/lib/api";
import { readCart, writeCart, type Cart } from "@/lib/cart";

export default function CartView() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Read the browser-only cart after mount (the server render has no cart).
    Promise.resolve().then(() => setCart(readCart()));
    api<ShopProduct[]>("GET", "/shop/products/").then((r) => r.ok && setProducts(r.data ?? []));
    api<Zone[]>("GET", "/shop/zones/").then((r) => r.ok && setZones(r.data ?? []));
  }, []);

  if (cart === null) return <p className="text-sm text-muted">Loading…</p>;
  const lines = Object.entries(cart)
    .map(([slug, quantity]) => ({ product: products.find((p) => p.slug === slug), slug, quantity }))
    .filter((l) => l.product);
  const physical = lines.some((l) => l.product!.kind === "physical");
  const currency = lines[0]?.product!.currency ?? "BDT";
  const itemsTotal = lines.reduce((sum, l) => sum + Number(l.product!.price) * l.quantity, 0);

  function change(slug: string, quantity: number) {
    const next = { ...cart! };
    if (quantity <= 0) delete next[slug];
    else next[slug] = Math.min(50, quantity);
    setCart(next);
    writeCart(next);
  }

  async function checkout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const r = await api<ShopOrderOut>("POST", "/shop/orders/", {
      items: lines.map((l) => ({ product: l.slug, quantity: l.quantity })),
      shipping_zone: physical ? Number(f.get("zone")) : null,
      shipping: physical ? { name: f.get("name"), phone: f.get("phone"), address: f.get("address") } : undefined,
      note: f.get("note"),
    });
    setBusy(false);
    if (r.status === 401 || r.status === 403) return router.push("/login?next=%2Fcart");
    if (!r.ok || !r.data) return setError(r.error);
    writeCart({});
    router.push(`/app/shop/${r.data.id}`);
  }

  if (lines.length === 0)
    return (
      <p className="text-muted">
        Your cart is empty. <Link href="/shop" className="text-brand underline">Browse the shop</Link>
      </p>
    );

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <ul className="divide-y divide-line rounded-xl border border-line">
        {lines.map(({ product: p, slug, quantity }) => (
          <li key={slug} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-medium">{p!.title}</p>
              <p className="mt-1 text-xs text-muted">{fmt(p!.currency, p!.price)}</p>
            </div>
            <div className="flex items-center gap-3">
              {p!.kind === "physical" ? (
                <input
                  aria-label={`Quantity of ${p!.title}`}
                  type="number"
                  min={1}
                  max={50}
                  value={quantity}
                  onChange={(e) => change(slug, Number(e.target.value))}
                  className="w-20 rounded-md border border-line bg-surface px-3 py-2"
                />
              ) : (
                <span className="text-xs text-muted">Download</span>
              )}
              <button type="button" className="text-muted hover:text-red-400" onClick={() => change(slug, 0)}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={checkout} className="space-y-3 rounded-xl border border-line bg-surface p-5 text-sm">
        <h2 className="font-semibold">Checkout</h2>
        {error && <Alert>{error}</Alert>}
        {physical && (
          <>
            <label className="block">
              Delivery area
              <select name="zone" required defaultValue="" className={field}>
                <option value="" disabled>
                  Choose
                </option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({fmt(z.currency, z.fee)})
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              Name
              <input name="name" required maxLength={120} className={field} />
            </label>
            <label className="block">
              Phone
              <input name="phone" required maxLength={30} className={field} />
            </label>
            <label className="block">
              Full address
              <textarea name="address" required rows={3} maxLength={300} className={field} />
            </label>
          </>
        )}
        <label className="block">
          Note (optional)
          <input name="note" maxLength={500} className={field} />
        </label>
        <p className="flex justify-between border-t border-line pt-3">
          <span className="text-muted">Items</span>
          <span>{fmt(currency, String(itemsTotal))}</span>
        </p>
        {physical && <p className="text-xs text-muted">The delivery fee is added when you place the order.</p>}
        <button disabled={busy} className={btn + " w-full"}>
          {busy ? "Placing order…" : "Place order"}
        </button>
        <p className="text-xs text-muted">
          Nothing is charged online. After placing the order you will see how to pay by bKash, Nagad or bank, and
          your order is held for you meanwhile.
        </p>
      </form>
    </div>
  );
}
