import type { Metadata } from "next";
import OrderView from "@/components/shop/OrderView";
import { getMe } from "@/lib/auth/server";
import { isStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Order" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, me] = await Promise.all([params, getMe()]);
  return <OrderView id={id} staff={isStaff(me!)} />;
}
