import { techGroups } from "@/lib/tech";
import Reveal from "./Reveal";

export default function TechStack() {
  return (
    <div className="space-y-10">
      {techGroups.map((g) => (
        <div key={g.layer}>
          <Reveal className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h3 className="font-mono text-sm uppercase tracking-[0.18em] text-brand">{g.layer}</h3>
            <p className="text-sm text-muted">{g.tagline}</p>
          </Reveal>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((t, i) => (
              <Reveal key={t.name} delay={i * 70}>
                <article className="glow-border h-full rounded-xl border border-line bg-surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-semibold">{t.name}</h4>
                    <span className="shrink-0 rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-muted">{t.role}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">{t.brief}</p>
                  <p className="mt-4 border-t border-line pt-3 font-mono text-[11px] text-brand">Used in: {t.usedIn}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
