import type { Metadata } from "next";
import BillingList from "@/components/app/billing/BillingList";
import { getMe } from "@/lib/auth/server";
import { isStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const me = (await getMe())!;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
      <BillingList staff={isStaff(me)} />
    </div>
  );
}
