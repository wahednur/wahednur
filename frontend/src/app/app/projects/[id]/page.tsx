import type { Metadata } from "next";
import ProjectView from "@/components/app/ProjectView";
import { getMe } from "@/lib/auth/server";
import { isStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, me] = await Promise.all([params, getMe()]);
  return <ProjectView id={id} staff={isStaff(me!)} />;
}
