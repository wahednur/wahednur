import type { Metadata } from "next";
import InvoiceView from "@/components/app/billing/InvoiceView";
import { getMe } from "@/lib/auth/server";
import { isStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Invoice" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, me] = await Promise.all([params, getMe()]);
  return <InvoiceView id={id} staff={isStaff(me!)} />;
}
