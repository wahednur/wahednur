import type { Metadata } from "next";
import OrdersView from "@/components/app/orders/OrdersView";
import { getMe } from "@/lib/auth/server";
import { isStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Requests" };

export default async function Page() {
  const me = (await getMe())!;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Requests</h1>
      <OrdersView staff={isStaff(me)} />
    </div>
  );
}
