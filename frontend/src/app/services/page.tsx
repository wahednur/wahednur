import type { Metadata } from "next";
import ServiceIcon from "@/components/ServiceIcon";
import PageHero from "@/components/PageHero";
import CtaBand from "@/components/CtaBand";
import { aiWorkflow, faq, notOffered, serviceList } from "@/lib/services";
import { process } from "@/lib/site";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Custom eCommerce, business management applications, admin dashboards, Django REST APIs and improvements to existing web apps.",
};

export default function ServicesPage() {
  return (
    <>
      <PageHero
        label="Services"
        title="What I can build for you"
        intro="Web applications for real business workflows. These services come from systems I have built and run myself."
      />
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-14 sm:px-6">
        {serviceList.map((s) => (
          <section key={s.title} className="rounded-xl border border-line bg-surface p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <ServiceIcon name={s.icon} />
              <h2 className="text-xl font-semibold tracking-tight">{s.title}</h2>
            </div>
            <p className="mt-4 max-w-2xl text-muted">{s.summary}</p>
            <p className="mt-4 text-sm text-muted">
              <span className="font-semibold text-ink">Good for: </span>
              {s.goodFor}
            </p>
            {s.note && <p className="mt-3 text-sm italic text-brand">{s.note}</p>}
            <ul className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
              {s.includes.map((i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" aria-hidden />
                  {i}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="border-t border-line py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">{aiWorkflow.title}</p>
          <div className="mt-4 max-w-2xl space-y-3 leading-7 text-muted">
            {aiWorkflow.text.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">How I work</p>
          <ol className="mt-6 grid gap-5 md:grid-cols-4">
            {process.map((p) => (
              <li key={p.n} className="rounded-xl border border-line p-6">
                <span className="font-mono text-sm text-brand">{p.n}</span>
                <h3 className="mt-3 font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{p.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-line py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">What I do not offer</p>
          <ul className="mt-4 max-w-2xl list-disc space-y-2 pl-5 text-muted">
            {notOffered.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-line py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">Questions</p>
          <dl className="mt-6 max-w-2xl space-y-6">
            {faq.map((f) => (
              <div key={f.q}>
                <dt className="font-semibold">{f.q}</dt>
                <dd className="mt-1 text-muted">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
