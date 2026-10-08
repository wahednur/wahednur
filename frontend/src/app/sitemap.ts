import type { MetadataRoute } from "next";
import { caseStudies } from "@/lib/caseStudies";
import { getPosts } from "@/lib/cms";
import { getProducts } from "@/lib/shop";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/work", "/services", "/packages", "/about", "/contact"];
  let posts: Awaited<ReturnType<typeof getPosts>> = [];
  try {
    posts = await getPosts();
  } catch {
    /* the API is down: the sitemap still lists everything else */
  }
  let products: Awaited<ReturnType<typeof getProducts>> = [];
  try {
    products = await getProducts();
  } catch {
    /* ignore */
  }
  return [
    ...pages.map((p) => ({ url: `${site.url}${p}` })),
    ...caseStudies.map((c) => ({ url: `${site.url}/work/${c.slug}` })),
    ...(posts.length ? [{ url: `${site.url}/blog` }] : []),
    ...(products.length ? [{ url: `${site.url}/shop` }] : []),
    ...products.map((p) => ({ url: `${site.url}/shop/${p.slug}` })),
    ...posts.map((p) => ({ url: `${site.url}/blog/${p.slug}`, lastModified: p.updated_at })),
  ];
}
