import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Markdown from "@/components/Markdown";
import { getPage, readingMinutes, socialCover } from "@/lib/cms";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let page = null;
  try {
    page = await getPage(slug);
  } catch {
    /* outage: fall back to the generic title */
  }
  if (!page) return { title: "Post", robots: { index: false } };
  const url = `/blog/${page.slug}`;
  return {
    title: page.seo_title,
    description: page.seo_description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: page.seo_title,
      description: page.seo_description,
      publishedTime: page.published_at ?? undefined,
      modifiedTime: page.updated_at,
      authors: [site.name],
      ...(socialCover(page.cover_image)
        ? {
            images: [
              {
                url: socialCover(page.cover_image)!,
                width: 1200,
                height: 630,
                alt: page.cover_alt,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: socialCover(page.cover_image) ? "summary_large_image" : "summary",
    },
  };
}

async function Post({ params }: Props) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page || page.kind !== "post") notFound();

  // Structured data built only from real fields of this post.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: page.title,
    description: page.seo_description,
    datePublished: page.published_at,
    dateModified: page.updated_at,
    author: { "@type": "Person", name: site.name, url: site.url },
    mainEntityOfPage: `${site.url}/blog/${page.slug}`,
    ...(socialCover(page.cover_image)
      ? { image: new URL(socialCover(page.cover_image)!, site.url).toString() }
      : {}),
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Link href="/blog" className="text-sm text-muted hover:text-brand">
        ← All posts
      </Link>
      <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
        {page.title}
      </h1>
      <p className="mt-3 font-mono text-xs text-muted">
        {site.name}
        {page.published_at && (
          <>
            {" · "}
            <time dateTime={page.published_at}>
              {page.published_at.slice(0, 10)}
            </time>
          </>
        )}
        {" · "}
        {readingMinutes(page.body)} min read
      </p>
      {page.cover_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={page.cover_image}
          alt={page.cover_alt}
          width={1200}
          height={630}
          fetchPriority="high"
          className="mt-8 aspect-[1200/630] w-full rounded-2xl border border-line object-cover"
        />
      )}
      <div className="mt-10">
        <Markdown>{page.body}</Markdown>
      </div>
    </article>
  );
}

export default function PostPage(props: Props) {
  return (
    <Suspense
      fallback={
        <p className="mx-auto max-w-3xl px-4 py-14 text-muted">Loading…</p>
      }
    >
      <Post {...props} />
    </Suspense>
  );
}
