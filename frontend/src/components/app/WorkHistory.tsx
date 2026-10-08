import type { HistoryEvent } from "@/lib/api";

const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const fmtDay = (iso: string) => DAY.format(new Date(iso.length === 10 ? `${iso}T00:00:00` : iso));

/** Everything that happened on the project, newest first, grouped by day: reports, notes and finished steps. */
export default function WorkHistory({ events, staff }: { events: HistoryEvent[]; staff: boolean }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted">Nothing here yet. Daily reports and updates will appear as the work moves.</p>;
  }
  const groups = new Map<string, HistoryEvent[]>();
  for (const e of events) {
    const key = e.at.slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return (
    <div className="space-y-8">
      {[...groups].map(([day, list]) => (
        <div key={day}>
          <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-brand">{fmtDay(day)}</h3>
          <ul className="mt-3 space-y-3 border-l border-line pl-5">
            {list.map((e) => (
              <li key={`${e.type}${e.id}`} className="relative">
                <span aria-hidden className={`absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-bg ${e.type === "milestone" ? "bg-brand" : e.type === "report" ? "bg-amber-300" : "bg-muted"}`} />
                {e.type === "report" ? (
                  <article className="rounded-xl border border-line bg-surface p-4 text-sm">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-amber-300/40 px-2 py-0.5 font-mono text-[10px] uppercase text-amber-200">Daily report</span>
                      <span className="font-medium">{e.title}</span>
                      {e.draft && <span className="font-mono text-[10px] text-muted">draft, only you see this</span>}
                    </p>
                    {e.items && e.items.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {e.items.map((it, i) => (
                          <li key={i} className="flex gap-2 leading-6"><span aria-hidden className="text-brand">✓</span>{it}</li>
                        ))}
                      </ul>
                    )}
                    {e.next_steps && (
                      <p className="mt-3 border-t border-line pt-3 leading-6 text-muted"><span className="font-medium text-ink">Next: </span>{e.next_steps}</p>
                    )}
                    {e.hours && <p className="mt-2 font-mono text-[11px] text-muted">{e.hours} hours today</p>}
                  </article>
                ) : e.type === "milestone" ? (
                  <p className="text-sm"><span className="font-medium">Step finished:</span> {e.title} <span className="font-mono text-[11px] text-muted">{TIME.format(new Date(e.at))}</span></p>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-6">
                    {e.title}
                    <span className="ml-2 font-mono text-[11px] text-muted">{TIME.format(new Date(e.at))}{staff && e.internal ? " · internal" : ""}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
