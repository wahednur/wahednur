import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { api } from "@/lib/http";

export const field =
  "mt-1 block w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:outline-none";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface ${className}`}>{children}</div>;
}

export function PageHeader({ title, intro, action }: { title: string; intro?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {intro && <p className="mt-1 text-sm text-muted">{intro}</p>}
      </div>
      {action}
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "brand" | "plain" | "danger"; small?: boolean };
export function Button({ tone = "plain", small, className = "", ...p }: BtnProps) {
  const tones = {
    brand: "bg-brand text-bg hover:opacity-90",
    plain: "border border-line bg-surface-2 text-ink hover:border-brand/60",
    danger: "border border-red-400/40 text-red-300 hover:bg-red-400/10",
  };
  return (
    <button
      {...p}
      className={`rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
        small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
      } ${tones[tone]} ${className}`}
    />
  );
}

const BADGE: Record<string, string> = {
  paid: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  published: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  active: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  accepted: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  completed: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  delivered: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  overdue: "bg-red-400/10 text-red-300 border-red-400/30",
  declined: "bg-red-400/10 text-red-300 border-red-400/30",
  rejected: "bg-red-400/10 text-red-300 border-red-400/30",
  dead: "bg-slate-400/10 text-slate-300 border-slate-400/30",
  ended: "bg-slate-400/10 text-slate-300 border-slate-400/30",
  paused: "bg-amber-400/10 text-amber-200 border-amber-400/30",
  sent: "bg-sky-400/10 text-sky-300 border-sky-400/30",
  cancelled: "bg-red-400/10 text-red-300 border-red-400/30",
  partial: "bg-amber-400/10 text-amber-200 border-amber-400/30",
  unpaid: "bg-amber-400/10 text-amber-200 border-amber-400/30",
  requested: "bg-amber-400/10 text-amber-200 border-amber-400/30",
  payment_review: "bg-amber-400/10 text-amber-200 border-amber-400/30",
  processing: "bg-sky-400/10 text-sky-300 border-sky-400/30",
  shipped: "bg-sky-400/10 text-sky-300 border-sky-400/30",
  awaiting_payment: "bg-amber-400/10 text-amber-200 border-amber-400/30",
  payment_reported: "bg-amber-400/10 text-amber-200 border-amber-400/30",
};
const NAME: Record<string, string> = { sent: "delivered", rejected: "lost" };
export function Badge({ value }: { value: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${
        BADGE[value] ?? "border-line text-muted"
      }`}
    >
      {(NAME[value] ?? value).replaceAll("_", " ")}
    </span>
  );
}

export function Notice({ kind = "error", children }: { kind?: "error" | "ok"; children: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-sm ${
        kind === "error" ? "border-red-400/40 bg-red-400/10 text-red-200" : "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
      }`}
    >
      {children}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">{children}</p>;
}

export function Loading() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-surface" />
      ))}
    </div>
  );
}

/** A responsive table: scrolls sideways on a phone instead of breaking the page. */
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </Card>
  );
}
export const Td = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
  <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>
);

export function Search({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className={`${field} mt-0 max-w-xs`}
    />
  );
}

export function Tabs({ tabs, value, onChange }: { tabs: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          role="tab"
          aria-selected={value === key}
          onClick={() => onChange(key)}
          className={`rounded-lg px-3 py-1.5 text-sm ${value === key ? "bg-brand/15 font-medium text-brand" : "text-muted hover:bg-surface"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Loads a list once, with a reload function for after a change. */
export function useLoad<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) return; // nothing to load (for example a new, unsaved item)
    let live = true;
    api<T>("GET", path).then((r) => {
      if (!live) return;
      if (r.ok) {
        setData(r.data);
        setError("");
      } else setError(r.error);
    });
    return () => {
      live = false;
    };
  }, [path, tick]);
  return { data, error, reload: () => setTick((t) => t + 1) };
}
