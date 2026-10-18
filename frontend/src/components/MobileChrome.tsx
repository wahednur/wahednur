import { Suspense } from "react";
import type { NavItem } from "@/lib/nav";
import BottomNav from "./BottomNav";

/**
 * Page content plus the phone bottom tab bar. The bar and its clearance space step aside in the
 * dashboard and on the sign-in pages by CSS (see globals.css), so this needs no route check here.
 */
export default function MobileChrome({ children, items }: { children: React.ReactNode; items: NavItem[] }) {
  return (
    <>
      <div className="mobile-pad flex-1">{children}</div>
      <Suspense fallback={null}>
        <BottomNav items={items} />
      </Suspense>
    </>
  );
}
