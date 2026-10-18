"use client";

import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";

const authPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

/** Wraps page content so the phone bottom tab bar (and its clearance space) skip the dashboard and auth pages, which have their own flow. */
export default function MobileChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideAppNav = pathname.startsWith("/app") || authPaths.some((p) => pathname.startsWith(p));

  return (
    <>
      <div className={`flex-1 ${hideAppNav ? "" : "pb-16 sm:pb-0"}`}>{children}</div>
      {!hideAppNav && <BottomNav />}
    </>
  );
}
