import type { Metadata } from "next";
import OrdersList from "@/components/shop/OrdersList";
import { getMe } from "@/lib/auth/server";
import { isStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Shop orders" };

export default async function Page() {
  const me = (await getMe())!;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Shop orders</h1>
      <OrdersList staff={isStaff(me)} />
    </div>
  );
}
