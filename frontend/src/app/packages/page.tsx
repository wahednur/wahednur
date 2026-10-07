import type { Metadata } from "next";
import { Suspense } from "react";
import OrderButton from "@/components/OrderButton";
import PageHero from "@/components/PageHero";
import { CYCLE_LABEL, fmt } from "@/lib/api";
import { getServices } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Packages",
  description: "Ready-made packages with a fixed scope and a fixed price.",
};

async function List() {
  const services = await getServices();
  if (!services || services.every((s) => s.packages.length === 0)) {
    return (
      <p className="text-muted">
        Packages are being prepared. For now, <a className="text-brand underline" href="/contact">tell me about your project</a> and I will quote it.
      </p>
    );
  }
  return (
    <div className="space-y-14">
      {services
        .filter((s) => s.packages.length > 0)
        .map((s) => (
          <section key={s.slug} aria-labelledby={s.slug}>
            <h2 id={s.slug} className="text-2xl font-semibold tracking-tight">
              {s.title}
            </h2>
            <p className="mt-2 max-w-2xl text-muted">{s.summary}</p>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {s.packages.map((p) => (
                <article key={p.id} className="flex flex-col rounded-xl border border-line bg-surface p-6">
                  <h3 className="font-semibold">{p.name}</h3>
                  {p.tagline && <p className="mt-1 text-sm text-muted">{p.tagline}</p>}
                  <p className="mt-4 text-3xl font-semibold">{fmt(p.currency, p.price)}</p>
                  <p className="font-mono text-[11px] text-muted">{CYCLE_LABEL[p.cycle]}</p>
                  <ul className="mt-5 flex-1 space-y-2 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span aria-hidden className="text-brand">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 font-mono text-[11px] text-muted">
                    {p.delivery_days ? `${p.delivery_days} days delivery` : ""}
                    {p.delivery_days && p.revisions != null ? " · " : ""}
                    {p.revisions != null ? `${p.revisions} revisions` : ""}
                  </p>
                  <div className="mt-5">
                    <OrderButton packageId={p.id} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}

export default function PackagesPage() {
  return (
    <>
      <PageHero
        label="Packages"
        title="Fixed scope, fixed price"
        intro="Pick a package and send a request. I reply by email to confirm the details before anything is billed."
      />
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <Suspense fallback={<p className="text-muted">Loading packages…</p>}>
          <List />
        </Suspense>
      </div>
    </>
  );
}
