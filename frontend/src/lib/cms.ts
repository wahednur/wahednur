import { cacheLife, cacheTag } from "next/cache";

const API = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export type CmsItem = {
  kind: "post" | "page";
  slug: string;
  title: string;
  excerpt: string;
  published_at: string | null;
  updated_at: string;
  seo_title: string;
  seo_description: string;
};
export type CmsPage = CmsItem & { body: string };

/** Published posts. Cached for an hour; the API refreshes it the moment content changes. */
export async function getPosts(): Promise<CmsItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("cms");
  if (!API) return [];
  const res = await fetch(`${API}/api/cms/pages/?kind=post`);
  if (!res.ok) throw new Error(`CMS list failed: ${res.status}`);
  return (await res.json()) as CmsItem[];
}

/** One published page, or null when it does not exist (a 404 is a real answer, an outage is not). */
export async function getPage(slug: string): Promise<CmsPage | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("cms", `cms:${slug}`);
  if (!API) return null;
  const res = await fetch(`${API}/api/cms/pages/${encodeURIComponent(slug)}/`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`CMS page failed: ${res.status}`);
  return (await res.json()) as CmsPage;
}
