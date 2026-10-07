"use client";

import Link from "next/link";
import { useState } from "react";
import { addToCart } from "@/lib/cart";
import type { ShopProduct } from "@/lib/api";

export default function AddToCart({ product }: { product: ShopProduct }) {
  const [added, setAdded] = useState(false);
  if (!product.in_stock) return <p className="text-sm text-muted">Out of stock right now.</p>;
  return (
    <div className="space-y-3">
      <button
        type="button"
        className="w-full rounded-md bg-brand px-5 py-3 text-sm font-semibold text-bg hover:opacity-90"
        onClick={() => {
          addToCart(product.slug, 1, product.kind === "digital");
          setAdded(true);
        }}
      >
        Add to cart
      </button>
      {added && (
        <p role="status" className="text-sm text-brand">
          Added. <Link href="/cart" className="underline">Go to your cart</Link>
        </p>
      )}
    </div>
  );
}
