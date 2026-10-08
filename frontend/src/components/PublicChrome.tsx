"use client";

import { usePathname } from "next/navigation";

/** The public header and footer belong to the website. The signed-in area has its own frame. */
export default function PublicChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === "/app" || path.startsWith("/app/")) return null;
  return <>{children}</>;
}
