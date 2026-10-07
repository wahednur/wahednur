import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";

// Only paths the CMS can create are accepted, so the secret cannot be used to flush anything else.
const ALLOWED = /^(\/|\/sitemap\.xml|\/blog|\/blog\/[a-z0-9_-]{1,120}|\/[a-z0-9_-]{1,120})$/;

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET ?? "";
  const given = request.headers.get("x-revalidate-secret") ?? "";
  // No secret configured means the endpoint is closed, never open.
  if (!secret || !same(secret, given)) return new Response("Forbidden", { status: 403 });

  let paths: unknown;
  try {
    paths = ((await request.json()) as { paths?: unknown }).paths;
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (!Array.isArray(paths) || paths.length > 20 || !paths.every((p) => typeof p === "string" && ALLOWED.test(p))) {
    return new Response("Bad request", { status: 400 });
  }
  revalidateTag("cms", { expire: 0 }); // the cached API responses: the next visitor gets fresh content
  for (const p of paths as string[]) revalidatePath(p); // the rendered pages
  return Response.json({ revalidated: paths });
}
