"use client";

import { useState } from "react";
import { downloadFile } from "@/lib/api";
import { Alert } from "@/components/auth/ui";

export const field =
  "mt-2 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none";
export const btn =
  "rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-60";
export const ghost = "rounded-md border border-line px-3 py-1.5 text-sm hover:border-brand/60";

const TONE: Record<string, string> = {
  paid: "border-brand/50 text-brand",
  accepted: "border-brand/50 text-brand",
  overdue: "border-red-400/50 text-red-300",
  rejected: "border-red-400/50 text-red-300",
  dead: "border-line text-muted",
  cancelled: "border-red-400/50 text-red-300",
  expired: "border-red-400/50 text-red-300",
};
export function Badge({ value }: { value: string }) {
  return (
    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${TONE[value] ?? "border-line text-muted"}`}>
      {({ sent: "delivered", rejected: "lost" } as Record<string, string>)[value] ?? value.replace("_", " ")}
    </span>
  );
}

export function PdfButton({ path, name }: { path: string; name: string }) {
  const [error, setError] = useState("");
  return (
    <>
      <button type="button" className={ghost} onClick={async () => setError(await downloadFile(path, name))}>
        Download PDF
      </button>
      {error && <Alert>{error}</Alert>}
    </>
  );
}
