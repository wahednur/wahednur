import Image from "next/image";
import Link from "next/link";
import { getCaseStudy } from "@/lib/caseStudies";
import type { Project } from "@/lib/site";

export default function ProjectCard({ project: p }: { project: Project }) {
  const cover = getCaseStudy(p.slug)?.cover;
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-brand/50">
      {cover && (
        <Link href={`/work/${p.slug}`} tabIndex={-1} aria-hidden className="relative block aspect-[16/10] overflow-hidden border-b border-line bg-surface-2">
          <Image
            src={cover.src}
            alt=""
            fill
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
            className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </Link>
      )}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-muted">{p.kind}</span>
          <span className="rounded-full border border-brand/40 px-2.5 py-0.5 font-mono text-[11px] text-brand">
            {p.status}
          </span>
        </div>
        <h3 className="mt-4 text-xl font-semibold tracking-tight">
          <Link href={`/work/${p.slug}`} className="hover:text-brand">
            {p.title}
          </Link>
        </h3>
        <p className="mt-3 flex-1 text-sm leading-6 text-muted">{p.summary}</p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {p.stack.map((s) => (
            <li key={s} className="rounded border border-line bg-surface-2 px-2 py-1 font-mono text-[11px] text-muted">
              {s}
            </li>
          ))}
        </ul>
        <Link href={`/work/${p.slug}`} className="mt-6 text-sm font-medium text-brand hover:underline">
          Read the case study →
        </Link>
      </div>
    </article>
  );
}
