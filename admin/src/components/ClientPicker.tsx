import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, field, Notice } from "@/components/ui";
import { api } from "@/lib/http";
import type { ClientRow } from "@/lib/types";

/** A searchable client list with a "new client" button that opens a window, so the form is never left. */
export default function ClientPicker({
  clients,
  value,
  onChange,
  onCreated,
  disabled,
}: {
  clients: ClientRow[];
  value: number | null;
  onChange: (c: ClientRow | null) => void;
  onCreated: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const chosen = clients.find((c) => c.id === value) ?? null;

  useEffect(() => {
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const rows = useMemo(
    () => clients.filter((c) => `${c.full_name} ${c.company} ${c.email}`.toLowerCase().includes(q.toLowerCase())).slice(0, 50),
    [clients, q],
  );

  return (
    <div ref={box} className="relative text-sm">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={`${field} mt-0 flex flex-1 items-center justify-between text-left disabled:opacity-60`}
        >
          {chosen ? (
            <span className="truncate">
              {chosen.full_name || chosen.email}
              {chosen.company && <span className="text-muted"> · {chosen.company}</span>}
            </span>
          ) : (
            <span className="text-muted">Select a customer…</span>
          )}
          {chosen && <span className="ml-2 font-mono text-[11px] text-brand">{chosen.client_type}</span>}
        </button>
        {!disabled && (
          <Button type="button" onClick={() => setModal(true)}>
            + New client
          </Button>
        )}
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-line bg-surface shadow-xl">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company or email" aria-label="Search customers" className={`${field} m-2 mt-2 w-[calc(100%-1rem)]`} />
          <ul role="listbox" className="max-h-64 overflow-auto p-1">
            {rows.length === 0 && <li className="px-3 py-2 text-muted">No customer found. Use “New client”.</li>}
            {rows.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.id === value}
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                    setQ("");
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate">{c.full_name || c.email}</span>
                    <span className="block truncate text-xs text-muted">{c.company ? `${c.company} · ` : ""}{c.email}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <Badge value={c.client_type} />
                    <span className="mt-0.5 block font-mono text-[11px] text-muted">{c.currency}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {modal && (
        <NewClientModal
          onClose={() => setModal(false)}
          onCreated={(c) => {
            setModal(false);
            onCreated();
            onChange(c);
          }}
        />
      )}
    </div>
  );
}

function NewClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: ClientRow) => void }) {
  const [type, setType] = useState<ClientRow["client_type"]>("local");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation(); // do not submit the document form behind this window
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const r = await api<ClientRow>("POST", "/clients/", {
      email: String(f.get("email")),
      client_type: type,
      full_name: String(f.get("full_name") ?? ""),
      company: String(f.get("company") ?? ""),
      phone: String(f.get("phone") ?? ""),
      address: String(f.get("address") ?? ""),
    });
    setBusy(false);
    if (!r.ok || !r.data) return setError(r.error);
    onCreated(r.data);
  }

  // A portal keeps this form out of the document form that opened it (forms cannot be nested).
  return createPortal(
    <div className="fixed inset-0 z-40 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="New client">
      <button type="button" className="absolute inset-0 bg-black/70" aria-label="Close" onClick={onClose} />
      <form onSubmit={submit} className="relative max-h-full w-full max-w-lg space-y-3 overflow-auto rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-lg font-semibold">New client</h2>
        <p className="text-sm text-muted">We email them how to choose their own password. You never see it.</p>
        {error && <Notice>{error}</Notice>}
        <fieldset>
          <legend className="text-sm">Client type</legend>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            {([["local", "Local client", "billed in BDT"], ["foreign", "Foreign client", "billed in USD"]] as const).map(([v, label, hint]) => (
              <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${type === v ? "border-brand bg-brand/10" : "border-line"}`}>
                <input type="radio" name="client_type" checked={type === v} onChange={() => setType(v)} />
                <span>{label}<span className="block text-xs text-muted">{hint}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm">Email<input name="email" type="email" required maxLength={254} autoFocus className={field} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Name<input name="full_name" maxLength={150} className={field} /></label>
          <label className="text-sm">Company<input name="company" maxLength={150} className={field} /></label>
          <label className="text-sm">Phone<input name="phone" maxLength={30} className={field} /></label>
          <label className="text-sm">Address<input name="address" maxLength={300} className={field} /></label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" tone="brand" disabled={busy}>{busy ? "Creating…" : "Create client"}</Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
