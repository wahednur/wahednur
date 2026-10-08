"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

/** The signed-in area's menu: scrolls sideways on a phone and marks the page you are on. */
export default function AppNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard" className="-mx-1 w-full overflow-x-auto lg:w-auto lg:max-w-[calc(100%-14rem)]">
      <ul className="flex min-w-max gap-1 px-1 text-sm">
        {items.map((item) => {
          const active = item.href === "/app" ? path === "/app" : path.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-lg px-3 py-1.5 transition-colors ${
                  active ? "bg-brand/15 font-medium text-brand" : "text-muted hover:bg-surface hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
