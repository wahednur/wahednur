"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/auth/ui";
import { Badge, ghost } from "@/components/app/billing/Bits";
import { api, CYCLE_LABEL, fmt, type OrderRow } from "@/lib/api";

export default function OrdersView({ staff }: { staff: boolean }) {
  const [rows, setRows] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    api<OrderRow[]>("GET", "/catalog/orders/").then((r) => (r.ok ? setRows(r.data) : setError(r.error)));
  }, [tick]);

  async function act(id: string, action: string, ask: string) {
    if (!window.confirm(ask)) return;
    setError("");
    const r = await api("POST", `/catalog/orders/${id}/${action}/`);
    if (r.ok) setTick((t) => t + 1);
    else setError(r.error);
  }

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}
      {rows === null && !error && <p className="text-sm text-muted">Loading…</p>}
      {rows?.length === 0 && <p className="text-sm text-muted">No requests yet.</p>}
      <ul className="divide-y divide-line rounded-xl border border-line">
        {rows?.map((o) => (
          <li key={o.id} className="space-y-2 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{o.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {fmt(o.currency, o.unit_price)} {CYCLE_LABEL[o.cycle]}
                  {staff && ` · ${o.client_email}`}
                </p>
              </div>
              <Badge value={o.status} />
            </div>
            {o.note && <p className="whitespace-pre-wrap text-muted">{o.note}</p>}
            <div className="flex flex-wrap gap-3">
              {staff && o.status === "requested" && (
                <>
                  <button
                    className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-bg hover:opacity-90"
                    onClick={() =>
                      act(
                        o.id,
                        "accept",
                        o.cycle === "one_time"
                          ? "Accept? This creates a project and a draft quotation."
                          : "Accept? This creates a project and starts the subscription."
                      )
                    }
                  >
                    Accept
                  </button>
                  <button className={ghost} onClick={() => act(o.id, "decline", "Decline this request?")}>
                    Decline
                  </button>
                </>
              )}
              {!staff && o.status === "requested" && (
                <button className={ghost} onClick={() => act(o.id, "cancel", "Cancel this request?")}>
                  Cancel request
                </button>
              )}
              {o.project && (
                <Link href={`/app/projects/${o.project}`} className="text-brand hover:underline">
                  Open project →
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
