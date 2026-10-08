import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    // Pictures in /public never change under the same name for long: let browsers and the CDN reuse
    // them for a day (and serve a stale copy for a week while refreshing) instead of re-checking each visit.
    const imageCache = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/blog/:file*.(svg|png)", headers: imageCache },
      { source: "/work/:path*.(svg|png|jpg)", headers: imageCache },
    ];
  },
  // Self-contained server output, only for the Docker image (the Dockerfile sets
  // NEXT_OUTPUT=standalone). Vercel builds with the normal Next.js output.
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
