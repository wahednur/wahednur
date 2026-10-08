"use client";

import Link from "next/link";
import { useRef } from "react";
import type { NavItem } from "@/lib/nav";

/** The phone menu. A plain <details> (works without waiting for scripts); picking a link closes it. */
export default function MobileNav({ items, resume }: { items: NavItem[]; resume: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => {
    if (ref.current) ref.current.open = false;
  };
  return (
    <details ref={ref} className="relative md:hidden">
      <summary
        aria-label="Menu"
        className="cursor-pointer list-none rounded-md border border-line px-3 py-2 text-sm text-ink marker:content-none [&::-webkit-details-marker]:hidden"
      >
        Menu
      </summary>
      <nav aria-label="Mobile" className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-line bg-bg p-2 shadow-lg">
        {items.map((n) => (
          <Link key={n.href} href={n.href} onClick={close} className="block rounded-md px-3 py-2.5 text-sm hover:bg-surface">
            {n.label}
          </Link>
        ))}
        <a href={resume} onClick={close} className="block rounded-md px-3 py-2.5 text-sm text-brand hover:bg-surface">
          Resume
        </a>
      </nav>
    </details>
  );
}
