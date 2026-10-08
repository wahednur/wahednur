import { cacheLife, cacheTag } from "next/cache";

// The site's main links, in one place. Packages and Shop appear only when there is something to
// show (a published package, a published product). Set NEXT_PUBLIC_SHOW_PACKAGES / _SHOP / _BLOG
// to "false" in the website's environment to force one off.
const on = (flag: string | undefined) => flag !== "false";
const API = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export type NavItem = { href: string; label: string };

async function get(path: string): Promise<unknown> {
  try {
    const res = await fetch(`${API}${path}`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** What the public API has right now. Cached, and refreshed with the same tags as the pages. */
async function contentFlags(): Promise<{ packages: boolean; shop: boolean; blog: boolean }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("shop", "catalog", "cms");
  if (!API) return { packages: false, shop: false, blog: true };
  const [services, products] = await Promise.all([get("/api/catalog/services/"), get("/api/shop/products/")]);
  const packages = Array.isArray(services) && services.some((s) => Array.isArray(s?.packages) && s.packages.length > 0);
  return { packages, shop: Array.isArray(products) && products.length > 0, blog: true };
}

export async function getMainNav(): Promise<NavItem[]> {
  const has = await contentFlags();
  return [
    { href: "/work", label: "Work" },
    { href: "/services", label: "Services" },
    ...(on(process.env.NEXT_PUBLIC_SHOW_PACKAGES) && has.packages ? [{ href: "/packages", label: "Packages" }] : []),
    ...(on(process.env.NEXT_PUBLIC_SHOW_SHOP) && has.shop ? [{ href: "/shop", label: "Shop" }] : []),
    ...(on(process.env.NEXT_PUBLIC_SHOW_BLOG) ? [{ href: "/blog", label: "Blog" }] : []),
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];
}
