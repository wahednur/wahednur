"use client";

import { useId, useState } from "react";
import { Alert } from "@/components/auth/ui";
import { api } from "@/lib/api";
import { btn, field as input } from "@/components/app/billing/Bits";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "select" | "checkbox" | "lines" | "image";
  options?: [string, string][];
  required?: boolean;
  step?: string;
  hint?: string;
  disabled?: boolean;
  wide?: boolean;
};
type Values = Record<string, string | boolean>;

/** One small form for every "edit this record" screen. Turns the typed text into the JSON the API wants. */
export default function Form({
  fields,
  initial,
  onSave,
  submitLabel = "Save",
  resetOnSave = false,
  extra,
}: {
  fields: Field[];
  initial: Record<string, unknown>;
  onSave: (payload: Record<string, unknown>) => Promise<string>;
  submitLabel?: string;
  resetOnSave?: boolean;
  extra?: React.ReactNode;
}) {
  const uid = useId();
  const start = (): Values =>
    Object.fromEntries(
      fields.map((f) => {
        const v = initial[f.name];
        if (f.type === "checkbox") return [f.name, Boolean(v)];
        if (f.type === "lines") return [f.name, Array.isArray(v) ? (v as string[]).join("\n") : ""];
        return [f.name, v === null || v === undefined ? "" : String(v)];
      }),
    );
  const [values, setValues] = useState<Values>(start);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (name: string, value: string | boolean) => setValues((v) => ({ ...v, [name]: value }));

  async function upload(name: string, file: File) {
    setError("");
    const body = new FormData();
    body.set("file", file);
    const r = await api<{ url: string }>("POST", "/shop/images/", body);
    if (r.ok && r.data) set(name, r.data.url);
    else setError(r.error);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.disabled) continue;
      const v = values[f.name];
      if (f.type === "checkbox") payload[f.name] = v === true;
      else if (f.type === "lines")
        payload[f.name] = String(v).split("\n").map((s) => s.trim()).filter(Boolean);
      else if (f.type === "number" && v === "") payload[f.name] = f.required ? "" : null;
      else payload[f.name] = v;
    }
    setBusy(true);
    setError("");
    setNote("");
    const message = await onSave(payload);
    setBusy(false);
    if (message) setError(message);
    else {
      setNote("Saved.");
      if (resetOnSave) setValues(start());
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 text-sm">
      {error && <Alert>{error}</Alert>}
      {note && <Alert kind="info">{note}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => {
          const id = `${uid}-${f.name}`;
          const wide = f.wide || f.type === "textarea" || f.type === "lines" || f.type === "image";
          const common = { id, disabled: f.disabled, required: f.required };
          return (
            <div key={f.name} className={wide ? "sm:col-span-2" : ""}>
              {f.type === "checkbox" ? (
                <label className="flex items-center gap-2" htmlFor={id}>
                  <input
                    id={id}
                    type="checkbox"
                    checked={values[f.name] === true}
                    onChange={(e) => set(f.name, e.target.checked)}
                  />
                  {f.label}
                </label>
              ) : (
                <>
                  <label htmlFor={id} className="font-medium">
                    {f.label}
                  </label>
                  {f.type === "textarea" || f.type === "lines" ? (
                    <textarea
                      {...common}
                      rows={f.type === "lines" ? 4 : 5}
                      value={String(values[f.name])}
                      onChange={(e) => set(f.name, e.target.value)}
                      className={input}
                    />
                  ) : f.type === "select" ? (
                    <select
                      {...common}
                      value={String(values[f.name])}
                      onChange={(e) => set(f.name, e.target.value)}
                      className={input}
                    >
                      {f.options?.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "image" ? (
                    <div className="mt-2 space-y-2">
                      <input
                        {...common}
                        type="url"
                        placeholder="https://… (or upload below)"
                        value={String(values[f.name])}
                        onChange={(e) => set(f.name, e.target.value)}
                        className={input + " !mt-0"}
                      />
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp"
                        aria-label={`${f.label}: upload a photo`}
                        onChange={(e) => e.target.files?.[0] && upload(f.name, e.target.files[0])}
                        className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border file:border-line file:bg-surface file:px-3 file:py-2 file:text-ink"
                      />
                      {values[f.name] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={String(values[f.name])} alt="" className="h-24 rounded-md border border-line object-cover" />
                      )}
                    </div>
                  ) : (
                    <input
                      {...common}
                      type={f.type ?? "text"}
                      step={f.step}
                      value={String(values[f.name])}
                      onChange={(e) => set(f.name, e.target.value)}
                      className={input}
                    />
                  )}
                  {f.hint && <p className="mt-1 text-xs text-muted">{f.hint}</p>}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={busy} className={btn}>
          {busy ? "Saving…" : submitLabel}
        </button>
        {extra}
      </div>
    </form>
  );
}
