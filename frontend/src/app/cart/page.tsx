import type { Metadata } from "next";
import CartView from "@/components/shop/Cart";

export const metadata: Metadata = { title: "Cart", robots: { index: false, follow: false } };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Your cart</h1>
      <CartView />
    </div>
  );
}
