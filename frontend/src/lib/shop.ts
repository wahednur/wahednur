import { cacheLife, cacheTag } from "next/cache";
import type { ShopProduct } from "./api";

const API = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

/** Published products. Cached for an hour. Returns [] when the API has none or is not configured. */
export async function getProducts(): Promise<ShopProduct[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("shop");
  if (!API) return [];
  const res = await fetch(`${API}/api/shop/products/`);
  if (!res.ok) throw new Error(`Shop list failed: ${res.status}`);
  return (await res.json()) as ShopProduct[];
}

export async function getProduct(slug: string): Promise<ShopProduct | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("shop", `shop:${slug}`);
  if (!API) return null;
  const res = await fetch(`${API}/api/shop/products/${encodeURIComponent(slug)}/`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Shop product failed: ${res.status}`);
  return (await res.json()) as ShopProduct;
}
