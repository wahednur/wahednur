"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/auth/ui";
import { Badge } from "@/components/app/billing/Bits";
import { api, fmt, ORDER_STATUS_LABEL, type ShopOrderOut } from "@/lib/api";

export default function OrdersList({ staff }: { staff: boolean }) {
  const [rows, setRows] = useState<ShopOrderOut[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<ShopOrderOut[]>("GET", "/shop/orders/").then((r) => (r.ok ? setRows(r.data) : setError(r.error)));
  }, []);

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}
      {rows === null && !error && <p className="text-sm text-muted">Loading…</p>}
      {rows?.length === 0 && (
        <p className="text-sm text-muted">
          No orders yet. <Link href="/shop" className="text-brand underline">Visit the shop</Link>
        </p>
      )}
      <ul className="divide-y divide-line rounded-xl border border-line">
        {rows?.map((o) => (
          <li key={o.id}>
            <Link href={`/app/shop/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm hover:bg-surface">
              <div>
                <p className="font-medium">{o.number}</p>
                <p className="mt-1 text-xs text-muted">
                  {o.items.map((i) => `${i.quantity > 1 ? `${i.quantity} × ` : ""}${i.title}`).join(", ")}
                  {staff && ` · ${o.customer_email}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono">{fmt(o.currency, o.total)}</span>
                <Badge value={o.status} />
                <span className="sr-only">{ORDER_STATUS_LABEL[o.status]}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
