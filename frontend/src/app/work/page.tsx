import type { Metadata } from "next";
import ProjectCard from "@/components/ProjectCard";
import PageHero from "@/components/PageHero";
import CtaBand from "@/components/CtaBand";
import { projects } from "@/lib/site";

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
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.slug} project={p} />
        ))}
      </div>
      <CtaBand />
    </>
  );
}
