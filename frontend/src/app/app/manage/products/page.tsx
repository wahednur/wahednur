import type { Metadata } from "next";
import ProductsManager from "@/components/app/manage/ProductsManager";

export const metadata: Metadata = { title: "Products" };

export default function Page() {
  return <ProductsManager />;
}
