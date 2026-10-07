import type { Metadata } from "next";
import SubscriptionsView from "@/components/app/orders/SubscriptionsView";
import { getMe } from "@/lib/auth/server";
import { isStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Subscriptions" };

export default async function Page() {
  const me = (await getMe())!;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
      <SubscriptionsView staff={isStaff(me)} />
    </div>
  );
}
