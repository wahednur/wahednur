import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import CtaBand from "@/components/CtaBand";
import { caseStudies } from "@/lib/caseStudies";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Case studies: an eCommerce platform, a service and parts management system, and an education management demo.",
};

export default function WorkPage() {
  return (
    <>
      <PageHero
        label="Work"
        title="Case studies"
        intro="Each project is labelled as my own product or a demo. I write what each system does, why it was built that way, and what its limits are."
      />
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-14 sm:px-6">
        {caseStudies.map((c) => (
          <Link
            key={c.slug}
            href={`/work/${c.slug}`}
            className="group block rounded-xl border border-line bg-surface p-6 transition-colors hover:border-brand/50 sm:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted">{c.kind}</span>
              <span className="rounded-full border border-brand/40 px-2.5 py-0.5 font-mono text-[11px] text-brand">
                {c.status}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">{c.title}</h2>
            <p className="mt-3 max-w-2xl text-muted">{c.tagline}</p>
            <span className="mt-5 inline-block text-sm font-medium text-brand group-hover:underline">
              Read the case study →
            </span>
          </Link>
        ))}
      </div>
      <CtaBand />
    </>
  );
}
