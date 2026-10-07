import type { Metadata } from "next";
import ContentManager from "@/components/app/content/ContentManager";
import { getMe } from "@/lib/auth/server";
import { isStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Content" };

export default async function ContentPage() {
  const me = (await getMe())!;
  if (!isStaff(me)) return <p className="text-sm text-muted">Content is managed by staff.</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Content</h1>
      <ContentManager />
    </div>
  );
}
