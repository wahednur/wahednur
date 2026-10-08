"use client";

import { useEffect, useMemo, useState } from "react";
import { site } from "@/lib/site";

const ZONES = [
  ["America/Los_Angeles", "Los Angeles"], ["America/Denver", "Denver"], ["America/Chicago", "Chicago"], ["America/New_York", "New York"],
  ["America/Toronto", "Toronto"], ["Europe/London", "London"], ["Europe/Berlin", "Berlin"], ["Europe/Istanbul", "Istanbul"],
  ["Asia/Riyadh", "Riyadh"], ["Asia/Dubai", "Dubai"], ["Asia/Kolkata", "India"], ["Asia/Dhaka", "Dhaka"],
  ["Asia/Singapore", "Singapore"], ["Asia/Tokyo", "Tokyo"], ["Australia/Sydney", "Sydney"], ["Pacific/Auckland", "Auckland"],
] as const;

/** Offset of a zone from UTC in minutes, right now (so daylight saving is respected). */
function offsetMin(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" }).formatToParts(at);
  const v = Object.fromEntries(parts.map((p) => [p.type, Number(p.value)]));
  return (Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute) - Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate(), at.getUTCHours(), at.getUTCMinutes())) / 60000;
}
const fmt = (h: number) => `${String(Math.floor(h) % 24).padStart(2, "0")}:${h % 1 ? "30" : "00"}`;

/** Shows, in the visitor's own time, when I am at my desk and how much of their working day that covers. */
export default function TimezoneOverlap() {
  const [tz, setTz] = useState<string>("Europe/London");
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Browser-only values: read after mount so server and client markup match.
    const first = setTimeout(() => {
      if (detected) setTz(detected);
      setNow(new Date());
    }, 0);
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const zones = useMemo(() => (ZONES.some(([z]) => z === tz) ? [...ZONES] : [[tz, tz.split("/").pop()!.replaceAll("_", " ")] as const, ...ZONES]), [tz]);
  const at = now ?? new Date(0);
  const delta = (offsetMin(tz, at) - offsetMin(site.hours.tz, at)) / 60; // their clock minus mine, in hours
  const cells = Array.from({ length: 48 }, (_, i) => i / 2); // their local day, in half hours
  const mine = (h: number) => {
    const my = (((h - delta) % 24) + 24) % 24; // the same moment on my clock
    return my >= site.hours.start && my < site.hours.end;
  };
  const theirs = (h: number) => h >= 9 && h < 18; // a normal working day, 09:00–18:00 where you are
  const overlap = cells.filter((h) => mine(h) && theirs(h));
  const first = overlap[0];
  const last = overlap[overlap.length - 1];
  const hours = overlap.length / 2;
  const mineLocal = (() => {
    const s = (((site.hours.start + delta) % 24) + 24) % 24;
    const e = (((site.hours.end + delta) % 24) + 24) % 24;
    return `${fmt(s)}–${fmt(e)}`;
  })();
  const myNow = now ? new Intl.DateTimeFormat("en-GB", { timeZone: site.hours.tz, hour: "2-digit", minute: "2-digit" }).format(now) : "--:--";
  const yourNow = now ? new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(now) : "--:--";

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="text-sm">
          Where are you?
          <select value={tz} onChange={(e) => setTz(e.target.value)} className="mt-1 block rounded-md border border-line bg-bg px-3 py-2 text-sm">
            {zones.map(([z, name]) => (<option key={z} value={z}>{name}</option>))}
          </select>
        </label>
        <p className="font-mono text-xs text-muted">Now: <span className="text-ink">{yourNow}</span> for you · <span className="text-ink">{myNow}</span> for me</p>
      </div>

      <div className="mt-6" role="img" aria-label={`My hours in your time are ${mineLocal}. We overlap ${hours} hours of a 09:00 to 18:00 working day.`}>
        <div className="flex h-9 overflow-hidden rounded-md border border-line">
          {cells.map((h) => {
            const m = mine(h), t = theirs(h);
            return <span key={h} title={fmt(h)} className={`flex-1 transition-colors ${m && t ? "bg-brand" : m ? "bg-brand/35" : t ? "bg-surface-2" : "bg-bg"}`} />;
          })}
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10px] text-muted"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
          <li className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-brand" />both at work</li>
          <li className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-brand/35" />I am online</li>
          <li className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-surface-2" />your 09–18 day</li>
        </ul>
      </div>

      <p className="mt-5 text-sm leading-6">
        {hours > 0 ? (
          <>We share <b className="text-brand">{hours} hour{hours === 1 ? "" : "s"}</b> of your working day, from <b>{fmt(first)}</b> to <b>{fmt(last + 0.5)}</b> your time. </>
        ) : (
          <>Our working days do not overlap, so we would work by written updates and short calls at a time you pick. </>
        )}
        <span className="text-muted">I am at my desk {mineLocal} in your time ({site.hours.label} {String(site.hours.start).padStart(2, "0")}:00–{site.hours.end}:00).</span>
      </p>
    </div>
  );
}
