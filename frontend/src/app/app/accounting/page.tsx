import type { Metadata } from "next";
import AccountingView from "@/components/app/accounting/AccountingView";
import { getMe } from "@/lib/auth/server";
import { isOwner } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Accounting" };

export default async function AccountingPage() {
  const me = (await getMe())!;
  if (!isOwner(me)) {
    return <p className="text-sm text-muted">Accounting is for the owner only.</p>;
  }
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Accounting</h1>
      <AccountingView />
    </div>
  );
}
