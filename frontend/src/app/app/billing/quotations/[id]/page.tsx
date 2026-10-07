import type { Metadata } from "next";
import QuotationView from "@/components/app/billing/QuotationView";
import { getMe } from "@/lib/auth/server";
import { isStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Quotation" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, me] = await Promise.all([params, getMe()]);
  return <QuotationView id={id} staff={isStaff(me!)} />;
}
