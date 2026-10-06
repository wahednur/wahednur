import type { MetadataRoute } from "next";
import { caseStudies } from "@/lib/caseStudies";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/work", "/services", "/about", "/contact"];
  return [
    ...pages.map((p) => ({ url: `${site.url}${p}` })),
    ...caseStudies.map((c) => ({ url: `${site.url}/work/${c.slug}` })),
  ];
}
