"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/auth/ui";
import { field as input } from "@/components/app/billing/Bits";
import { api, type ClientFull } from "@/lib/api";
import Form, { type Field } from "./Form";

const FIELDS: Field[] = [
  { name: "full_name", label: "Full name" },
  { name: "company", label: "Company" },
  { name: "phone", label: "Phone" },
  { name: "address", label: "Address", wide: true },
  { name: "internal_notes", label: "Private notes (the client never sees these)", type: "textarea" },
];

export default function ClientsManager() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ClientFull[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      api<ClientFull[]>("GET", `/clients/${q ? `?q=${encodeURIComponent(q)}` : ""}`).then((r) =>
        r.ok ? setRows(r.data) : setError(r.error),
      );
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <label className="block max-w-sm text-sm">
        Search by email, name or company
        <input value={q} onChange={(e) => setQ(e.target.value)} className={input} />
      </label>
      {rows?.length === 0 && <p className="text-sm text-muted">No client accounts found. Clients appear here after they sign up.</p>}
      {rows?.map((c) => (
        <details key={c.id} className="rounded-xl border border-line">
          <summary className="cursor-pointer p-4 text-sm">
            <span className="font-semibold">{c.company || c.full_name || c.email}</span>
            <span className="ml-2 text-muted">{c.email}</span>
          </summary>
          <div className="border-t border-line p-4">
            <Form
              fields={FIELDS}
              initial={c}
              onSave={async (payload) => {
                const r = await api("PATCH", `/clients/${c.id}/`, payload);
                return r.ok ? "" : r.error;
              }}
            />
          </div>
        </details>
      ))}
    </div>
  );
}
