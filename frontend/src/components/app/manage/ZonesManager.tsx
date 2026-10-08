"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/auth/ui";
import { api, type ManagedZone } from "@/lib/api";
import { ghost } from "@/components/app/billing/Bits";
import Form, { type Field } from "./Form";

const FIELDS: Field[] = [
  { name: "name", label: "Area name (for example Dhaka city)", required: true },
  { name: "fee", label: "Delivery fee", type: "number", step: "0.01", required: true },
  { name: "currency", label: "Currency", type: "select", options: [["BDT", "BDT (৳)"], ["USD", "USD ($)"]] },
  { name: "position", label: "Order (small first)", type: "number" },
  { name: "active", label: "Offered to buyers", type: "checkbox" },
];

export default function ZonesManager() {
  const [zones, setZones] = useState<ManagedZone[] | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const reload = () => setTick((t) => t + 1);
  useEffect(() => {
    api<ManagedZone[]>("GET", "/manage/zones/").then((r) => (r.ok ? setZones(r.data) : setError(r.error)));
  }, [tick]);
  const save = (method: string, path: string) => async (payload: Record<string, unknown>) => {
    const r = await api(method, path, payload);
    if (r.ok) reload();
    return r.ok ? "" : r.error;
  };
  return (
    <div className="space-y-6">
      {error && <Alert>{error}</Alert>}
      {zones?.length === 0 && <p className="text-sm text-muted">No delivery areas yet. Delivered products cannot be ordered until you add one.</p>}
      {zones?.map((z) => (
        <details key={z.id} className="rounded-xl border border-line">
          <summary className="cursor-pointer p-4 text-sm">
            <span className="font-semibold">{z.name}</span> · {z.fee} {z.currency} · {z.active ? "offered" : "off"}
          </summary>
          <div className="space-y-3 border-t border-line p-4">
            <Form fields={FIELDS} initial={z} onSave={save("PUT", `/manage/zones/${z.id}/`)} />
            <button
              className={ghost}
              onClick={async () => {
                if (!window.confirm(`Delete "${z.name}"?`)) return;
                setError("");
                const r = await api("DELETE", `/manage/zones/${z.id}/`);
                if (r.ok) reload();
                else setError(r.error);
              }}
            >
              Delete area
            </button>
          </div>
        </details>
      ))}
      <div className="rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-3 font-semibold">Add a delivery area</h2>
        <Form key={zones?.length ?? 0} fields={FIELDS} initial={{ currency: "BDT", position: 0, active: true }} onSave={save("POST", "/manage/zones/")} submitLabel="Add area" />
      </div>
    </div>
  );
}
