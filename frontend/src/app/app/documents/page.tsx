import type { Metadata } from "next";
import DocumentsPanel from "@/components/app/DocumentsPanel";
import { getMe } from "@/lib/auth/server";
import { isStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const me = (await getMe())!;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
      <DocumentsPanel staff={isStaff(me)} />
    </div>
  );
}
