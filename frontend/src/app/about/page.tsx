import type { Metadata } from "next";
import Image from "next/image";
import PageHero from "@/components/PageHero";
import CtaBand from "@/components/CtaBand";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Abdul Wahed Nur: from visual effects and animation to full-stack web development and business software.",
};

const timeline = [
  {
    when: "2010 – 2019",
    what: "Visual effects, animation and graphics",
    text: "Worked in VFX, animation and print and graphics production, including assistant director on 5–6 TV commercials.",
  },
  {
    when: "2014 – 2016",
    what: "First web development work",
    text: "Designed and developed websites for NGO and development-sector clients as a web designer and developer in Dhaka, using WordPress and Joomla.",
  },
  {
    when: "2020 – 2021",
    what: "eCommerce core system, Saudi Arabia",
    text: "Defined the business logic and features for an eCommerce core system and directed its development. I did not write that code myself.",
  },
  {
    when: "2024 – 2025",
    what: "Formal MERN training",
    text: "Completed the Programming Hero web development courses (MERN stack) and began building full applications.",
  },
  {
    when: "Now",
    what: "Django, Next.js and my own products",
    text: "Backend work in Django REST Framework with PostgreSQL, front ends in Next.js and React. Running ekhaneikini.com and maintaining a service and parts management system.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        label="About"
        title="From visual effects to business software"
        intro="I came to software through visual work, and I stayed because I like building systems that people use every day."
      />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_380px]">
        <div className="max-w-2xl space-y-5 leading-8 text-muted">
          <Image
            src="/wahednur.jpg"
            alt="Abdul Wahed Nur"
            width={160}
            height={160}
            className="h-40 w-40 rounded-2xl border border-line object-cover"
          />
          <p>
            I am Abdul Wahed Nur, a full-stack developer based in Sherpur, Bangladesh.
            Before software I worked in VFX, animation and graphics. That time taught
            me how to present an idea clearly, and it still shapes how I design
            interfaces.
          </p>
          <p>
            I learned web development step by step: first WordPress and Joomla for
            client websites, later the MERN stack, and now Django for backend work.
            I prefer Django because it gives a clear structure for business rules,
            permissions and data.
          </p>
          <p>
            Much of my learning came from building real systems for real use. I run
            my own online store, and I built a management system around the way a
            repair business records work and payments. Doing this showed me what
            owners and staff need from software, not only what is technically
            possible.
          </p>
          <p>
            I am working toward larger reusable products for small businesses. Those
            are plans for now, and I keep them separate from what I have already built.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href={site.resume}
              className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-bg hover:opacity-90"
            >
              Download resume
            </a>
            <a
              href={site.github}
              className="rounded-md border border-line px-4 py-2.5 text-sm hover:border-brand/60 hover:text-brand"
            >
              GitHub
            </a>
            <a
              href={site.linkedin}
              className="rounded-md border border-line px-4 py-2.5 text-sm hover:border-brand/60 hover:text-brand"
            >
              LinkedIn
            </a>
          </div>
        </div>

        <aside aria-label="Timeline">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-brand">Timeline</h2>
          <ol className="mt-5 space-y-6 border-l border-line pl-5">
            {timeline.map((t) => (
              <li key={t.when} className="relative">
                <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-brand" aria-hidden />
                <p className="font-mono text-xs text-muted">{t.when}</p>
                <p className="mt-1 font-semibold">{t.what}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{t.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-xs leading-5 text-muted">
            Periods overlap because I worked on freelance and own projects alongside
            other roles. The timeline shows kinds of work, not continuous employment.
          </p>
        </aside>
      </div>
      <CtaBand />
    </>
  );
}
