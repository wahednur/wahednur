import Section from "@/components/Section";
import { process, projects, roadmap, services, site } from "@/lib/site";

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <div className="glow absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/3" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-mono text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
            Full-Stack Developer · Bangladesh
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            I build web applications around how your business really works.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            Online stores, business management systems and the APIs behind them.
            I take a workflow from the interface to the backend, and I run my own
            live eCommerce platform, so I design from the owner&apos;s side.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#work" className="rounded-md bg-brand px-5 py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90">
              View my work
            </a>
            <a href="#contact" className="rounded-md border border-line px-5 py-3 text-sm font-semibold transition-colors hover:border-brand/60 hover:text-brand">
              Discuss your project
            </a>
          </div>
          <p className="mt-10 font-mono text-xs text-muted">
            Django · DRF · PostgreSQL · Redis · Celery · Next.js · React · TypeScript
          </p>
        </div>
      </section>

      {/* Work */}
      <Section id="work" label="Selected work" title="Systems I built and run">
        <div className="grid gap-5 lg:grid-cols-3">
          {projects.map((p) => (
            <article key={p.title} className="flex flex-col rounded-xl border border-line bg-surface p-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted">{p.kind}</span>
                <span className="rounded-full border border-brand/40 px-2.5 py-0.5 font-mono text-[11px] text-brand">
                  {p.status}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-semibold tracking-tight">{p.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-muted">{p.summary}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {p.stack.map((s) => (
                  <li key={s} className="rounded border border-line bg-surface-2 px-2 py-1 font-mono text-[11px] text-muted">
                    {s}
                  </li>
                ))}
              </ul>
              {p.href && (
                <a href={p.href} className="mt-6 text-sm font-medium text-brand hover:underline">
                  {p.linkLabel} →
                </a>
              )}
            </article>
          ))}
        </div>
      </Section>

      {/* Services */}
      <Section id="services" label="Services" title="What I can build for you">
        <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div key={s.title} className="bg-surface p-6">
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Process */}
      <Section id="process" label="How I work" title="Clear scope, steady progress">
        <ol className="grid gap-5 md:grid-cols-4">
          {process.map((p) => (
            <li key={p.n} className="rounded-xl border border-line p-6">
              <span className="font-mono text-sm text-brand">{p.n}</span>
              <h3 className="mt-3 font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{p.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* About */}
      <Section id="about" label="About" title="From visual effects to business software">
        <div className="max-w-2xl space-y-4 leading-7 text-muted">
          <p>
            I worked in VFX, animation and graphics before moving into web
            development. That background shapes how I think about interfaces
            and presentation. I started with the MERN stack and now focus on
            Django for backend work, with Next.js and React on the front.
          </p>
          <p>
            I learn by building real systems for real businesses, and I keep
            them running. I work with clients in English and Bangla.
          </p>
        </div>
      </Section>

      {/* Roadmap */}
      <Section id="roadmap" label="Roadmap · planned" title="What I am working toward">
        <p className="max-w-2xl text-sm text-muted">
          These are plans, not released products.
        </p>
        <ul className="mt-5 flex flex-wrap gap-3">
          {roadmap.map((r) => (
            <li key={r} className="rounded-full border border-dashed border-line px-4 py-2 text-sm text-muted">
              {r}
            </li>
          ))}
        </ul>
      </Section>

      {/* Contact */}
      <Section id="contact" label="Contact" title="Tell me about your project">
        <p className="max-w-xl text-muted">
          Send a short description of what you need. I will reply with an honest
          view on scope and whether I am the right person for it.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={`mailto:${site.email}`} className="rounded-md bg-brand px-5 py-3 text-sm font-semibold text-bg hover:opacity-90">
            {site.email}
          </a>
          <a href={site.linkedin} className="rounded-md border border-line px-5 py-3 text-sm font-semibold hover:border-brand/60 hover:text-brand">
            LinkedIn
          </a>
          <a href={site.github} className="rounded-md border border-line px-5 py-3 text-sm font-semibold hover:border-brand/60 hover:text-brand">
            GitHub
          </a>
          <a href={site.resume} className="rounded-md border border-line px-5 py-3 text-sm font-semibold hover:border-brand/60 hover:text-brand">
            Download résumé
          </a>
        </div>
      </Section>
    </main>
  );
}
