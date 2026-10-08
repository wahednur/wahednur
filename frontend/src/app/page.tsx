import Link from "next/link";
import CtaBand from "@/components/CtaBand";
import ProjectCard from "@/components/ProjectCard";
import ServiceIcon from "@/components/ServiceIcon";
import Section from "@/components/Section";
import Faq from "@/components/home/Faq";
import HeroFlow from "@/components/home/HeroFlow";
import LiveProof from "@/components/home/LiveProof";
import PortalPreview from "@/components/home/PortalPreview";
import ProcessTimeline from "@/components/home/ProcessTimeline";
import Reveal from "@/components/home/Reveal";
import TimezoneOverlap from "@/components/home/TimezoneOverlap";
import TrustPillars from "@/components/home/TrustPillars";
import { serviceList } from "@/lib/services";
import { projects, site } from "@/lib/site";

const YEAR = new Date().getFullYear();

export default function Home() {
  const webYears = YEAR - site.startedWeb;
  const storeYears = YEAR - site.storeSince;
  const facts = [
    { k: `${webYears}+`, v: "years building for the web" },
    { k: `${storeYears}+`, v: "years running my own live store" },
    { k: String(serviceList.length), v: "services, scoped in writing" },
    { k: "EN · বাংলা", v: "support in both languages" },
  ];
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <div className="glow absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/3" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-mono text-xs text-muted">
              <span className="pulse-dot relative h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
              Remote engineering from Bangladesh
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Software your business can <span className="text-gradient">rely on</span>, built remotely.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
              Online stores, business systems and APIs for teams abroad. Scope
              agreed in writing, built in visible milestones, paid in steps. I
              run my own live store, so I build with an owner&apos;s eye.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/contact" className="rounded-md bg-brand px-5 py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90">
                Start a project
              </Link>
              <Link href="#work" className="rounded-md border border-line px-5 py-3 text-sm font-semibold transition-colors hover:border-brand/60 hover:text-brand">
                See live systems
              </Link>
            </div>
            <p className="mt-10 font-mono text-xs text-muted">
              Django · DRF · PostgreSQL · Redis · Celery · Next.js · React · TypeScript
            </p>
          </div>
          <HeroFlow />
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-t border-line bg-surface/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {facts.map((f, i) => (
              <Reveal key={f.v} delay={i * 80}>
                <dt className="text-2xl font-semibold tracking-tight text-brand">{f.k}</dt>
                <dd className="mt-1 text-xs leading-5 text-muted">{f.v}</dd>
              </Reveal>
            ))}
          </dl>
          <LiveProof />
        </div>
      </section>

      <Section id="trust" label="Why trust me" title="Reasons you can hire from far away with confidence">
        <TrustPillars />
      </Section>

      {/* Work */}
      <Section id="work" label="Selected work" title="Live systems I built and run">
        <div className="grid gap-5 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.slug} project={p} />
          ))}
        </div>
      </Section>

      {/* Services */}
      <Section id="services" label="Services" title="What I can build for you">
        <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {serviceList.map((s) => (
            <div key={s.title} className="bg-surface p-6">
              <ServiceIcon name={s.icon} />
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{s.short}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="process" label="How we work" title="From first call to handover, in six clear steps">
        <ProcessTimeline />
      </Section>

      <Section id="portal" label="Client area" title="You see progress without asking for it">
        <PortalPreview />
      </Section>

      <Section id="hours" label="Time zones" title="Check how our working days overlap">
        <TimezoneOverlap />
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

      <Section id="faq" label="Questions" title="Answers before you ask">
        <Faq />
      </Section>

      <CtaBand />
    </main>
  );
}
