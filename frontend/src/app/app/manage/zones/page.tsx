import type { Metadata } from "next";
import ZonesManager from "@/components/app/manage/ZonesManager";

export const metadata: Metadata = { title: "Delivery areas" };

export default function Page() {
  return <ZonesManager />;
}
