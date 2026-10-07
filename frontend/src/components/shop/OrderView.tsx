"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/auth/ui";
import { Badge, btn, field, ghost } from "@/components/app/billing/Bits";
import { api, fmt, METHODS, ORDER_STATUS_LABEL, type ShopOrderOut } from "@/lib/api";

type Link_ = { product: string; url: string; filename: string };

export default function OrderView({ id, staff }: { id: string; staff: boolean }) {
  const [o, setO] = useState<ShopOrderOut | null>(null);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);
  const [tick, setTick] = useState(0);
  const [links, setLinks] = useState<Link_[] | null>(null);

  useEffect(() => {
    api<ShopOrderOut>("GET", `/shop/orders/${id}/`).then((r) => {
      if (r.ok) setO(r.data);
      else if (r.status === 404) setMissing(true);
      else setError(r.error);
    });
  }, [id, tick]);

  async function act(action: string, body?: unknown, ask?: string) {
    if (ask && !window.confirm(ask)) return false;
    setError("");
    const r = await api("POST", `/shop/orders/${id}/${action}/`, body ?? {});
    if (!r.ok) setError(r.error);
    else setTick((t) => t + 1);
    return r.ok;
  }

  async function loadLinks() {
    setError("");
    const r = await api<Link_[]>("GET", `/shop/orders/${id}/files/`);
    if (r.ok) setLinks(r.data ?? []);
    else setError(r.error);
  }

  if (missing) return <p className="text-sm text-muted">This order does not exist or is not yours.</p>;
  if (!o) return error ? <Alert>{error}</Alert> : <p className="text-sm text-muted">Loading…</p>;
  const waiting = o.status === "awaiting_payment" || o.status === "payment_review";

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted">{o.number}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{ORDER_STATUS_LABEL[o.status]}</h1>
          {staff && <p className="mt-1 text-sm text-muted">{o.customer_email}</p>}
        </div>
        <Badge value={o.status} />
      </header>
      {error && <Alert>{error}</Alert>}

      <ul className="divide-y divide-line rounded-xl border border-line text-sm">
        {o.items.map((i) => (
          <li key={i.title} className="flex justify-between gap-3 p-4">
            <span>
              {i.quantity > 1 && `${i.quantity} × `}
              {i.title} <span className="font-mono text-[11px] text-muted">{i.kind === "digital" ? "download" : "delivered"}</span>
            </span>
            <span>{fmt(o.currency, i.amount)}</span>
          </li>
        ))}
        {Number(o.shipping_fee) > 0 && (
          <li className="flex justify-between gap-3 p-4">
            <span>Delivery{o.shipping_zone ? ` · ${o.shipping_zone}` : ""}</span>
            <span>{fmt(o.currency, o.shipping_fee)}</span>
          </li>
        )}
        <li className="flex justify-between gap-3 p-4 font-semibold">
          <span>Total</span>
          <span>{fmt(o.currency, o.total)}</span>
        </li>
      </ul>

      {waiting && (
        <section aria-labelledby="pay" className="space-y-4 rounded-xl border border-line bg-surface p-5 text-sm">
          <h2 id="pay" className="font-semibold">
            {o.status === "payment_review" ? "Thank you. I am checking your payment." : `Pay ${fmt(o.currency, o.outstanding)}`}
          </h2>
          {o.payment_note && <p className="whitespace-pre-wrap">{o.payment_note}</p>}
          {o.status === "awaiting_payment" && (
            <>
              <p className="text-muted">
                After paying, enter the transaction ID below so I can find it.
                {o.expires_at && ` Your order is held until ${o.expires_at.slice(0, 16).replace("T", " ")} UTC.`}
              </p>
              {!staff && (
                <form
                  className="grid gap-3 sm:grid-cols-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    await act("claim", { method: f.get("method"), reference: f.get("reference") });
                  }}
                >
                  <label>
                    Paid with
                    <select name="method" defaultValue="bkash" className={field}>
                      {METHODS.map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="sm:col-span-2">
                    Transaction ID
                    <input name="reference" required maxLength={100} className={field} />
                  </label>
                  <button className={btn + " sm:col-span-3"}>I have paid</button>
                </form>
              )}
            </>
          )}
          {o.claimed && (
            <p className="text-muted">
              Reported: {METHODS.find(([k]) => k === o.claimed!.method)?.[1]} · {o.claimed.reference}
            </p>
          )}
        </section>
      )}

      {o.ship_to && (
        <section aria-labelledby="ship" className="text-sm">
          <h2 id="ship" className="font-semibold">
            Delivery
          </h2>
          <p className="mt-2 text-muted">
            {o.ship_to.name} · {o.ship_to.phone}
            <br />
            {o.ship_to.address}
          </p>
          {o.tracking && <p className="mt-2">Tracking: {o.tracking}</p>}
        </section>
      )}

      {o.has_downloads && (
        <section aria-labelledby="dl" className="space-y-3 text-sm">
          <h2 id="dl" className="font-semibold">
            Your downloads
          </h2>
          {links === null ? (
            <button className={btn} onClick={loadLinks}>
              Show download links
            </button>
          ) : (
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.url}>
                  <a href={l.url} className="text-brand underline">
                    {l.product} — {l.filename}
                  </a>
                </li>
              ))}
              <li className="text-xs text-muted">Links work for five minutes. Come back here for new ones any time.</li>
            </ul>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/app/shop" className={ghost}>
          All orders
        </Link>
        {(o.status === "awaiting_payment" || o.status === "payment_review") && (
          <button className={ghost} onClick={() => act("cancel", {}, "Cancel this order?")}>
            Cancel order
          </button>
        )}
        {staff && waiting && (
          <button className={btn} onClick={() => act("confirm-payment", {}, "Confirm that the money arrived?")}>
            Confirm payment received
          </button>
        )}
        {staff && o.status === "processing" && (
          <form
            className="flex items-end gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              await act("ship", { tracking: new FormData(e.currentTarget).get("tracking") });
            }}
          >
            <label className="text-sm">
              Tracking (optional)
              <input name="tracking" maxLength={200} className={field} />
            </label>
            <button className={btn}>Mark shipped</button>
          </form>
        )}
        {staff && o.status === "shipped" && (
          <button className={btn} onClick={() => act("deliver")}>
            Mark delivered
          </button>
        )}
        <Link href="/app/billing" className="text-sm text-brand hover:underline">
          Invoice →
        </Link>
      </div>
    </div>
  );
}
