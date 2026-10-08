import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import PageHero from "@/components/PageHero";
import { getPosts, type CmsItem } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes on building web applications with Django and Next.js.",
  alternates: { canonical: "/blog" },
};

async function Posts() {
  let posts: CmsItem[];
  try {
    posts = await getPosts();
  } catch {
    return (
      <p className="text-muted">
        The posts could not be loaded right now. Please try again in a moment.
      </p>
    );
  }
  if (posts.length === 0)
    return <p className="text-muted">The first posts are on the way.</p>;
  return (
    <ul className="grid gap-5 md:grid-cols-2">
      {posts.map((p) => (
        <li key={p.slug}>
          <Link
            href={`/blog/${p.slug}`}
            className="block h-full overflow-hidden rounded-xl border border-line bg-surface transition hover:border-brand/60"
          >
            {p.cover_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.cover_image}
                alt={p.cover_alt}
                width={1200}
                height={630}
                loading="lazy"
                decoding="async"
                className="aspect-[1200/630] w-full border-b border-line object-cover"
              />
            )}
            <div className="p-6">
              {p.published_at && (
                <time
                  dateTime={p.published_at}
                  className="font-mono text-[11px] text-muted"
                >
                  {p.published_at.slice(0, 10)}
                </time>
              )}
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                {p.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {p.seo_description || p.excerpt}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function BlogPage() {
  return (
    <>
      <PageHero
        label="Blog"
        title="Notes from the work"
        intro="What I learn while building and running real systems."
      />
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <Posts />
        </Suspense>
      </div>
    </>
  );
}
