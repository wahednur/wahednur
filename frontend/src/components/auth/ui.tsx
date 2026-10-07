"use client";

import { useId } from "react";

const input =
  "mt-2 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none aria-[invalid=true]:border-red-400";

export function Field({
  label,
  hint,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  return (
    <div className="text-sm">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <input
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-e` : hint ? `${id}-h` : undefined}
        className={input}
      />
      {hint && !error && (
        <p id={`${id}-h`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-e`} className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "info"; children: React.ReactNode }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`rounded-md border px-3 py-2 text-sm ${
        kind === "error" ? "border-red-400/40 bg-red-400/10 text-red-300" : "border-brand/40 bg-brand/10 text-ink"
      }`}
    >
      {children}
    </p>
  );
}

export function Submit({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full rounded-md bg-brand px-5 py-3 text-sm font-semibold text-bg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? "Please wait…" : children}
    </button>
  );
}

export const PASSWORD_HINT = "At least 12 characters. Avoid common passwords.";
