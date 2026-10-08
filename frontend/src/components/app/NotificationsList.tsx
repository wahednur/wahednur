"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ago, api, type AppNotification } from "@/lib/api";

const KIND: Record<string, string> = {
  update: "Update", milestone: "Step", report: "Daily report", quotation: "Quotation",
  invoice: "Invoice", payment: "Payment", message: "Message", system: "Notice",
};

export default function NotificationsList() {
  const [items, setItems] = useState<AppNotification[] | null>(null);
  useEffect(() => {
    api<{ items: AppNotification[] }>("GET", "/notifications/?limit=100").then((r) => setItems(r.ok && r.data ? r.data.items : []));
  }, []);
  if (!items) return <div className="h-40 animate-pulse rounded-2xl bg-surface" aria-busy />;
  async function open(n: AppNotification) {
    if (!n.read) await api("POST", "/notifications/read/", { ids: [n.id] });
    window.dispatchEvent(new Event("wn:notifications"));
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          className="text-sm text-brand hover:underline"
          onClick={async () => {
            await api("POST", "/notifications/read/", {});
            setItems(items.map((n) => ({ ...n, read: true })));
            window.dispatchEvent(new Event("wn:notifications"));
          }}
        >
          Mark all read
        </button>
      </div>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-8 text-center text-sm text-muted">Nothing yet. Updates on your projects will show up here.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {items.map((n) => (
            <li key={n.id} className={n.read ? "" : "bg-brand/[0.04]"}>
              <Link href={n.url || "#"} onClick={() => open(n)} className="flex gap-4 p-4 transition-colors hover:bg-surface-2">
                <span aria-hidden className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-brand"}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase text-muted">{KIND[n.kind] ?? "Notice"}</span>
                    <span className="text-sm font-medium">{n.title}</span>
                  </span>
                  {n.body && <span className="mt-1 block text-sm leading-6 text-muted">{n.body}</span>}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-muted">{ago(n.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
