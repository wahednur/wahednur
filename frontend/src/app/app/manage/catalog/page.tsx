import type { Metadata } from "next";
import CatalogManager from "@/components/app/manage/CatalogManager";

export const metadata: Metadata = { title: "Services and packages" };

export default function Page() {
  return <CatalogManager />;
}
