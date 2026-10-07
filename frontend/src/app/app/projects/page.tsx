import type { Metadata } from "next";
import ProjectsList from "@/components/app/ProjectsList";
import { getMe } from "@/lib/auth/server";
import { isStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const me = (await getMe())!;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
      <ProjectsList staff={isStaff(me)} />
    </div>
  );
}
