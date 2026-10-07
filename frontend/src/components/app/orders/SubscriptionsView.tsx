"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/auth/ui";
import { Badge, ghost } from "@/components/app/billing/Bits";
import { api, CYCLE_LABEL, fmt, type SubscriptionRow } from "@/lib/api";

export default function SubscriptionsView({ staff }: { staff: boolean }) {
  const [rows, setRows] = useState<SubscriptionRow[] | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    api<SubscriptionRow[]>("GET", "/subscriptions/").then((r) => (r.ok ? setRows(r.data) : setError(r.error)));
  }, [tick]);

  async function act(id: number, action: string, ask: string) {
    if (!window.confirm(ask)) return;
    setError("");
    const r = await api("POST", `/subscriptions/${id}/${action}/`);
    if (r.ok) setTick((t) => t + 1);
    else setError(r.error);
  }

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}
      {rows === null && !error && <p className="text-sm text-muted">Loading…</p>}
      {rows?.length === 0 && <p className="text-sm text-muted">No subscriptions yet.</p>}
      <ul className="divide-y divide-line rounded-xl border border-line">
        {rows?.map((s) => (
          <li key={s.id} className="space-y-2 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {fmt(s.currency, s.unit_price)} {CYCLE_LABEL[s.cycle]}
                  {staff && ` · ${s.client_email}`}
                  {s.next_billing_date && ` · next invoice ${s.next_billing_date}`}
                </p>
              </div>
              <Badge value={s.status} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {staff && s.status === "active" && (
                <button className={ghost} onClick={() => act(s.id, "pause", "Pause billing for this subscription?")}>
                  Pause
                </button>
              )}
              {staff && s.status === "paused" && (
                <button className={ghost} onClick={() => act(s.id, "resume", "Resume billing?")}>
                  Resume
                </button>
              )}
              {s.status !== "cancelled" && (
                <button
                  className={ghost}
                  onClick={() => act(s.id, "cancel", "Cancel this subscription? No further invoices will be created.")}
                >
                  Cancel subscription
                </button>
              )}
              <Link href={`/app/projects/${s.project}`} className="text-brand hover:underline">
                Project →
              </Link>
              {s.invoices.length > 0 && (
                <Link href="/app/billing" className="text-brand hover:underline">
                  {s.invoices.length} invoice{s.invoices.length > 1 ? "s" : ""} →
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
