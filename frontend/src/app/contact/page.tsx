import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import ContactForm from "@/components/ContactForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Tell me about your project. I reply with an honest view on scope and fit.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        label="Contact"
        title="Tell me about your project"
        intro="A few lines about the business problem is enough to start."
      />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_320px]">
        <ContactForm />
        <aside className="space-y-6 text-sm">
          <div>
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-brand">Direct</h2>
            <ul className="mt-3 space-y-2 text-muted">
              <li>
                <a href={`mailto:${site.email}`} className="hover:text-ink">
                  {site.email}
                </a>
              </li>
              <li>
                <a href={site.linkedin} className="hover:text-ink">LinkedIn</a>
              </li>
              <li>
                <a href={site.github} className="hover:text-ink">GitHub</a>
              </li>
              <li>
                <a href={site.resume} className="hover:text-ink">Resume (PDF)</a>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-brand">Good to know</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
              <li>Based in Bangladesh (GMT+6).</li>
              <li>I work in English and Bangla.</li>
              <li>I reply honestly, including when I am not the right fit.</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
