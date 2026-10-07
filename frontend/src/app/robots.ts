import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/app", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email"] }, sitemap: `${site.url}/sitemap.xml` };
}
