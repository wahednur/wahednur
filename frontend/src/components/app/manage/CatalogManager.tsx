"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/auth/ui";
import { api, type ManagedPackage, type ManagedService } from "@/lib/api";
import { ghost } from "@/components/app/billing/Bits";
import Form, { type Field } from "./Form";

const CURRENCY: [string, string][] = [["BDT", "BDT (৳)"], ["USD", "USD ($)"]];
const SERVICE_FIELDS: Field[] = [
  { name: "title", label: "Name", required: true },
  { name: "slug", label: "Address (letters, numbers, dashes)", required: true, hint: "Used in the web address. Lowercase." },
  { name: "summary", label: "One-line summary", required: true, wide: true },
  { name: "description", label: "Longer description (optional)", type: "textarea" },
  { name: "position", label: "Order on the page (small first)", type: "number" },
  { name: "published", label: "Published (visible on the website)", type: "checkbox" },
];
const PACKAGE_FIELDS: Field[] = [
  { name: "name", label: "Package name (Basic, Standard…)", required: true },
  { name: "tagline", label: "Short line under the name" },
  { name: "price", label: "Price", type: "number", step: "0.01", required: true },
  { name: "currency", label: "Currency", type: "select", options: CURRENCY },
  { name: "cycle", label: "Billing", type: "select", options: [["one_time", "One time"], ["monthly", "Every month"], ["yearly", "Every year"]] },
  { name: "delivery_days", label: "Delivery in days", type: "number" },
  { name: "revisions", label: "Revisions included", type: "number" },
  { name: "position", label: "Order (small first)", type: "number" },
  { name: "features", label: "What is included (one per line)", type: "lines", hint: "Up to 12 lines." },
  { name: "published", label: "Published", type: "checkbox" },
];
const NEW_PACKAGE = { currency: "BDT", cycle: "one_time", position: 0, published: false };

export default function CatalogManager() {
  const [services, setServices] = useState<ManagedService[] | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const reload = () => setTick((t) => t + 1);

  useEffect(() => {
    api<ManagedService[]>("GET", "/manage/services/").then((r) => (r.ok ? setServices(r.data) : setError(r.error)));
  }, [tick]);

  const save = (method: string, path: string, after = true) => async (payload: Record<string, unknown>) => {
    const r = await api(method, path, payload);
    if (r.ok && after) reload();
    return r.ok ? "" : r.error;
  };
  async function remove(path: string, ask: string) {
    if (!window.confirm(ask)) return;
    setError("");
    const r = await api("DELETE", path);
    if (r.ok) reload();
    else setError(r.error);
  }

  return (
    <div className="space-y-8">
      {error && <Alert>{error}</Alert>}
      {services === null && !error && <p className="text-sm text-muted">Loading…</p>}
      {services?.length === 0 && <p className="text-sm text-muted">No services yet. Add the first one below.</p>}

      {services?.map((s) => (
        <details key={s.id} className="rounded-xl border border-line">
          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4">
            <span className="font-semibold">{s.title}</span>
            <span className="font-mono text-[11px] text-muted">
              {s.published ? "published" : "hidden"} · {s.packages.length} package{s.packages.length === 1 ? "" : "s"}
            </span>
          </summary>
          <div className="space-y-6 border-t border-line p-4">
            <Form fields={SERVICE_FIELDS} initial={s} onSave={save("PUT", `/manage/services/${s.id}/`)} submitLabel="Save service" />
            <button className={ghost} onClick={() => remove(`/manage/services/${s.id}/`, `Delete "${s.title}" and its packages?`)}>
              Delete service
            </button>

            <h3 className="pt-2 font-semibold">Packages</h3>
            {s.packages.map((p: ManagedPackage) => (
              <details key={p.id} className="rounded-lg border border-line bg-surface">
                <summary className="cursor-pointer p-3 text-sm">
                  {p.name} · {p.price} {p.currency} · {p.published ? "published" : "hidden"}
                </summary>
                <div className="space-y-3 border-t border-line p-3">
                  <Form fields={PACKAGE_FIELDS} initial={p} onSave={save("PUT", `/manage/packages/${p.id}/`)} submitLabel="Save package" />
                  <button className={ghost} onClick={() => remove(`/manage/packages/${p.id}/`, `Delete package "${p.name}"?`)}>
                    Delete package
                  </button>
                </div>
              </details>
            ))}
            <div className="rounded-lg border border-dashed border-line p-3">
              <p className="mb-3 text-sm font-medium">Add a package</p>
              <Form
                key={`${s.id}-${s.packages.length}`}
                fields={PACKAGE_FIELDS}
                initial={NEW_PACKAGE}
                onSave={save("POST", `/manage/services/${s.id}/packages/`)}
                submitLabel="Add package"
              />
            </div>
          </div>
        </details>
      ))}

      <div className="rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-3 font-semibold">Add a service</h2>
        <Form
          key={services?.length ?? 0}
          fields={SERVICE_FIELDS}
          initial={{ position: 0, published: false }}
          onSave={save("POST", "/manage/services/")}
          submitLabel="Add service"
        />
      </div>
    </div>
  );
}
