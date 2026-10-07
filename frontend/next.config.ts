import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
