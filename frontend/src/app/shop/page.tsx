import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import PageHero from "@/components/PageHero";
import { fmt, type ShopProduct } from "@/lib/api";
import { getProducts } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Shop",
  description: "Digital downloads and products, with clear prices.",
  alternates: { canonical: "/shop" },
};

async function Products() {
  let products: ShopProduct[];
  try {
    products = await getProducts();
  } catch {
    return <p className="text-muted">The shop could not be loaded right now. Please try again in a moment.</p>;
  }
  if (products.length === 0) return <p className="text-muted">Products are being added.</p>;
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => (
        <li key={p.slug}>
          <Link
            href={`/shop/${p.slug}`}
            className="block h-full overflow-hidden rounded-xl border border-line bg-surface hover:border-brand/60"
          >
            {p.image_url && (
              <Image src={p.image_url} alt="" width={640} height={400} unoptimized className="h-44 w-full object-cover" />
            )}
            <div className="p-5">
              <p className="font-mono text-[11px] uppercase text-muted">{p.kind === "digital" ? "Download" : "Delivered"}</p>
              <h2 className="mt-1 font-semibold">{p.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{p.summary}</p>
              <p className="mt-3 font-semibold">
                {fmt(p.currency, p.price)}
                {!p.in_stock && <span className="ml-2 text-xs font-normal text-muted">Out of stock</span>}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function ShopPage() {
  return (
    <>
      <PageHero label="Shop" title="Products" intro="Digital downloads open right after your payment is confirmed. Delivered products ship to your address." />
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <Products />
        </Suspense>
      </div>
    </>
  );
}
