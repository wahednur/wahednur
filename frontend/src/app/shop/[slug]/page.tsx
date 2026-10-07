import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AddToCart from "@/components/shop/AddToCart";
import Markdown from "@/components/Markdown";
import { fmt } from "@/lib/api";
import { getProduct } from "@/lib/shop";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let p = null;
  try {
    p = await getProduct(slug);
  } catch {
    /* outage */
  }
  if (!p) return { title: "Product", robots: { index: false } };
  return {
    title: p.title,
    description: p.summary || undefined,
    alternates: { canonical: `/shop/${p.slug}` },
    openGraph: { title: p.title, description: p.summary || undefined, url: `/shop/${p.slug}` },
  };
}

async function Product({ params }: Props) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();

  // Structured data only from real fields of this product.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.summary || undefined,
    image: p.image_url || undefined,
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: p.currency,
      availability: p.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${site.url}/shop/${p.slug}`,
    },
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href="/shop" className="text-sm text-muted hover:text-brand">
        ← All products
      </Link>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        {p.image_url && (
          <Image src={p.image_url} alt={p.title} width={800} height={600} unoptimized className="w-full rounded-xl border border-line object-cover" />
        )}
        <div className="space-y-5">
          <p className="font-mono text-xs uppercase text-muted">{p.kind === "digital" ? "Digital download" : "Delivered to your address"}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{p.title}</h1>
          <p className="text-2xl font-semibold">{fmt(p.currency, p.price)}</p>
          {p.summary && <p className="text-muted">{p.summary}</p>}
          <AddToCart product={p} />
          <p className="text-xs text-muted">
            {p.kind === "digital"
              ? "You get the download as soon as I confirm your payment."
              : "Delivery fee is shown at checkout. I confirm your payment before shipping."}
          </p>
        </div>
      </div>
      {p.description && (
        <div className="mt-12 max-w-3xl">
          <Markdown>{p.description}</Markdown>
        </div>
      )}
    </div>
  );
}

export default function ProductPage(props: Props) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-5xl px-4 py-14 text-muted">Loading…</p>}>
      <Product {...props} />
    </Suspense>
  );
}
