import { BookOpenText, Braces, Container, Database, Layers, Palette, Plug, Server, Smartphone, Sparkles, Workflow, type LucideIcon } from "lucide-react";
import { techGroups } from "@/lib/tech";
import Reveal from "./Reveal";

const ICONS: Record<string, LucideIcon> = {
  server: Server, plug: Plug, workflow: Workflow, database: Database, book: BookOpenText,
  layers: Layers, braces: Braces, palette: Palette, phone: Smartphone, container: Container, sparkles: Sparkles,
};

export default function TechStack() {
  return (
    <div className="space-y-10">
      {techGroups.map((g) => {
        const Lead = ICONS[g.icon] ?? Layers;
        const gap = (3 - (g.items.length % 3)) % 3; // empty cells in the last row on wide screens
        return (
          <div key={g.layer}>
            <Reveal className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Lead className="h-4 w-4 text-brand/70" aria-hidden />
              <h3 className="font-mono text-sm uppercase tracking-[0.18em] text-brand">{g.layer}</h3>
              <p className="text-sm text-muted">{g.tagline}</p>
            </Reveal>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((t, i) => {
                const Icon = ICONS[t.icon] ?? Layers;
                return (
                  <Reveal key={t.name} delay={i * 70}>
                    <article className="glow-border h-full rounded-xl border border-line bg-surface p-5">
                      <div className="flex items-start gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-brand/20 bg-brand/[0.06] text-brand/80">
                          <Icon className="h-[18px] w-[18px]" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold leading-tight">{t.name}</h4>
                          <span className="mt-1 inline-block font-mono text-[11px] text-muted">{t.role}</span>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted">{t.brief}</p>
                      <p className="mt-4 border-t border-line pt-3 font-mono text-[11px] text-brand/90">Used in: {t.usedIn}</p>
                    </article>
                  </Reveal>
                );
              })}
              {gap > 0 && (
                <div
                  className={`hidden place-items-center rounded-xl border border-dashed border-line/80 lg:grid ${gap === 2 ? "lg:col-span-2" : ""}`}
                  aria-hidden
                >
                  <Lead className="h-14 w-14 text-brand/15" strokeWidth={1.2} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
