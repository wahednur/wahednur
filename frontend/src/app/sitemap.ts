import type { MetadataRoute } from "next";
import { caseStudies } from "@/lib/caseStudies";
import { getPosts } from "@/lib/cms";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/work", "/services", "/about", "/contact"];
  let posts: Awaited<ReturnType<typeof getPosts>> = [];
  try {
    posts = await getPosts();
  } catch {
    /* the API is down: the sitemap still lists everything else */
  }
  return [
    ...pages.map((p) => ({ url: `${site.url}${p}` })),
    ...caseStudies.map((c) => ({ url: `${site.url}/work/${c.slug}` })),
    ...(posts.length ? [{ url: `${site.url}/blog` }] : []),
    ...posts.map((p) => ({ url: `${site.url}/blog/${p.slug}`, lastModified: p.updated_at })),
  ];
}
