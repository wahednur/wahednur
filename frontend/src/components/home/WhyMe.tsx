import { differences, mission, principles, vision } from "@/lib/tech";
import Reveal from "./Reveal";

export function Different() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {differences.map((d, i) => (
        <Reveal key={d.t} delay={(i % 3) * 70}>
          <article className="glow-border h-full rounded-xl border border-line bg-surface p-6">
            <span className="font-mono text-xs text-brand">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="mt-3 font-semibold">{d.t}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{d.d}</p>
          </article>
        </Reveal>
      ))}
    </div>
  );
}

export function MissionVision() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {[["Mission", mission], ["Vision", vision]].map(([k, v], i) => (
          <Reveal key={k} delay={i * 90}>
            <article className="glow-border h-full rounded-xl border border-line bg-surface p-7">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">{k}</p>
              <p className="mt-4 text-lg leading-8">{v}</p>
            </article>
          </Reveal>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {principles.map((p, i) => (
          <Reveal key={p.t} delay={i * 70}>
            <article className="glow-border h-full rounded-xl border border-line bg-surface p-6">
              <h3 className="font-semibold text-brand">{p.t}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{p.d}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
