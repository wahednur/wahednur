import type { Milestone } from "@/lib/api";

/** The project's steps as a track: what is finished, what is being worked on now, what comes next. */
export default function StepTracker({ steps, progress }: { steps: Milestone[]; progress: number }) {
  if (steps.length === 0) return null;
  const done = steps.filter((s) => s.status === "done").length;
  const now = steps.findIndex((s) => s.status === "in_progress");
  const next = now >= 0 ? now : steps.findIndex((s) => s.status !== "done");
  const R = 34, C = 2 * Math.PI * R;

  return (
    <section aria-label="Project steps" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-5">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" role="img" aria-label={`${progress} percent complete`}>
            <circle cx="40" cy="40" r={R} fill="none" stroke="var(--wn-border)" strokeWidth="7" />
            <circle
              cx="40" cy="40" r={R} fill="none" stroke="var(--wn-primary)" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - progress / 100)} className="transition-[stroke-dashoffset] duration-700"
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center font-mono text-sm font-semibold">{progress}%</span>
        </div>
        <div>
          <p className="text-lg font-semibold">{done} of {steps.length} steps finished</p>
          <p className="mt-1 text-sm text-muted">
            {done === steps.length ? "All steps are finished." : next >= 0 ? `${now >= 0 ? "Working on" : "Next up"}: ${steps[next].title}` : ""}
          </p>
        </div>
      </div>

      <ol className="mt-6 grid gap-0 sm:grid-flow-col sm:auto-cols-fr">
        {steps.map((s, i) => {
          const state = s.status === "done" ? "done" : i === next ? "now" : "todo";
          return (
            <li key={s.id} className="relative flex gap-3 pb-5 sm:block sm:pb-0 sm:pr-3 sm:text-center">
              {i < steps.length - 1 && (
                <>
                  <span aria-hidden className={`absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5 sm:hidden ${s.status === "done" ? "bg-brand" : "bg-line"}`} />
                  <span aria-hidden className={`absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-[15px] hidden h-0.5 sm:block ${s.status === "done" ? "bg-brand" : "bg-line"}`} />
                </>
              )}
              <span
                className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-semibold sm:mx-auto ${
                  state === "done" ? "border-brand bg-brand text-bg" : state === "now" ? "step-now border-brand bg-bg text-brand" : "border-line bg-bg text-muted"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <div className="min-w-0 sm:mt-2.5">
                <p className={`text-sm ${state === "todo" ? "text-muted" : "font-medium"}`}>{s.title}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted">
                  {state === "done" ? "Done" : state === "now" ? "In progress" : "To do"}
                  {s.due_date && state !== "done" ? ` · due ${s.due_date}` : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
