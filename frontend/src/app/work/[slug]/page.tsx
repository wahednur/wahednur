import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import CtaBand from "@/components/CtaBand";
import { caseStudies, getCaseStudy } from "@/lib/caseStudies";

export function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getCaseStudy(slug);
  if (!c) return {};
  return { title: c.title, description: c.tagline };
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-10">
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-brand">{title}</h2>
        <div className="max-w-2xl leading-7 text-muted">{children}</div>
      </div>
    </section>
  );
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getCaseStudy(slug);
  if (!c) notFound();

  return (
    <>
      <PageHero label={`${c.kind} · ${c.status}`} title={c.title} intro={c.tagline} />
      <article className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="flex flex-wrap gap-3 pt-8">
          {c.href && (
            <a
              href={c.href}
              className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-bg hover:opacity-90"
            >
              {c.linkLabel} ↗
            </a>
          )}
          <Link
            href="/work"
            className="rounded-md border border-line px-4 py-2.5 text-sm hover:border-brand/60 hover:text-brand"
          >
            All case studies
          </Link>
        </div>

        <div className="mt-8">
          <Block title="Context">{c.context}</Block>
          <Block title="The problem">{c.problem}</Block>
          <Block title="My role">{c.role}</Block>

          <Block title="What I built">
            <ul className="list-disc space-y-2 pl-5">
              {c.solution.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Block>

          {c.workflow.length > 0 && (
            <Block title="Key workflow">
              <div className="space-y-5">
                {c.workflow.map((w) => (
                  <div key={w.actor}>
                    <p className="font-semibold text-ink">{w.actor}</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-5">
                      {w.steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </Block>
          )}

          {c.stack.length > 0 && (
            <Block title="Why this stack">
              <dl className="space-y-3">
                {c.stack.map((s) => (
                  <div key={s.name}>
                    <dt className="font-semibold text-ink">{s.name}</dt>
                    <dd>{s.why}</dd>
                  </div>
                ))}
              </dl>
            </Block>
          )}

          {c.challenges.length > 0 && (
            <Block title="Challenges and decisions">
              <div className="space-y-4">
                {c.challenges.map((ch) => (
                  <div key={ch.title}>
                    <p className="font-semibold text-ink">{ch.title}</p>
                    <p>{ch.text}</p>
                  </div>
                ))}
              </div>
            </Block>
          )}

          {c.screenshots.length > 0 && (
            <Block title="Screens">
              <div className="grid gap-4 sm:grid-cols-2">
                {c.screenshots.map((s) => (
                  <Image
                    key={s.src}
                    src={s.src}
                    alt={s.alt}
                    width={1200}
                    height={750}
                    className="rounded-lg border border-line"
                  />
                ))}
              </div>
            </Block>
          )}

          <Block title="Current status">{c.statusText}</Block>
          <Block title="Limits">
            <ul className="list-disc space-y-2 pl-5">
              {c.limits.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </Block>
        </div>
      </article>
      <CtaBand />
    </>
  );
}
