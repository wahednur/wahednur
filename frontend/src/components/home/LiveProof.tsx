"use client";

import { useEffect, useState } from "react";

const API = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const SYSTEMS = [
  { name: "This website's API", url: API ? `${API}/api/health/` : "", cors: true },
  { name: "ekhaneikini.com (my live store)", url: "https://ekhaneikini.com", cors: false },
  { name: "Service & parts system", url: "https://nurain.vercel.app", cors: false },
];

type Result = { ok: boolean; ms: number } | null;

async function ping(url: string, cors: boolean): Promise<Result> {
  const t = performance.now();
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    // Other sites cannot be read from the browser, but a reply (any reply) proves they are reachable.
    await fetch(url, { mode: cors ? "cors" : "no-cors", cache: "no-store", signal: ctl.signal });
    clearTimeout(timer);
    return { ok: true, ms: Math.round(performance.now() - t) };
  } catch {
    return { ok: false, ms: 0 };
  }
}

/** Real reachability checks, run in the visitor's own browser: nothing here is typed in by hand. */
export default function LiveProof() {
  const [res, setRes] = useState<Result[]>(SYSTEMS.map(() => null));
  const [at, setAt] = useState<Date | null>(null);

  useEffect(() => {
    let live = true;
    const run = async () => {
      const out = await Promise.all(SYSTEMS.map((s) => (s.url ? ping(s.url, s.cors) : Promise.resolve<Result>({ ok: false, ms: 0 }))));
      if (live) {
        setRes(out);
        setAt(new Date());
      }
    };
    void run();
    const id = setInterval(run, 60000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand">Live right now</p>
        <p className="font-mono text-[11px] text-muted">{at ? `checked ${at.toLocaleTimeString()}` : "checking…"}</p>
      </div>
      <ul className="mt-4 space-y-3">
        {SYSTEMS.map((s, i) => {
          const r = res[i];
          return (
            <li key={s.name} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-3">
                <span className={`relative h-2.5 w-2.5 rounded-full ${r === null ? "bg-line" : r.ok ? "pulse-dot bg-emerald-400 text-emerald-400" : "bg-amber-400"}`} aria-hidden />
                {s.name}
              </span>
              <span className="font-mono text-xs text-muted">{r === null ? "…" : r.ok ? `responding · ${r.ms} ms` : "no answer"}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs leading-5 text-muted">Measured from your browser to each system, a moment ago. Distance and your network add to the time.</p>
    </div>
  );
}
