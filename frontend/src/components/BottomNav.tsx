"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Briefcase, Layers, Mail, MoreHorizontal, X } from "lucide-react";
import type { NavItem } from "@/lib/nav";
import { site } from "@/lib/site";

const primary = [
  { href: "/", label: "Home", icon: Home },
  { href: "/work", label: "Work", icon: Briefcase },
  { href: "/services", label: "Services", icon: Layers },
  { href: "/contact", label: "Contact", icon: Mail },
];

/** Phone-only bottom tab bar: gives the site an app feel on small screens. Tablet+ keeps the top nav. */
export default function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const overflow = items.filter((n) => !primary.some((p) => p.href === n.href));
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const overflowActive = overflow.some((n) => isActive(n.href));

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 sm:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      <div
        className={`fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-line border-b-0 bg-surface p-2 shadow-2xl transition-transform duration-300 sm:hidden ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        aria-hidden={!open}
      >
        <div className="mb-1 flex items-center justify-between px-2 pt-1">
          <span className="text-sm font-medium text-ink">More</span>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav aria-label="More">
          {overflow.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-ink hover:bg-bg">
              {n.label}
            </Link>
          ))}
          <a href={site.resume} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-brand hover:bg-bg">
            Resume
          </a>
        </nav>
      </div>

      <nav
        aria-label="Mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur-lg sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5">
          {primary.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors active:scale-95 ${
                    active ? "text-brand" : "text-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="More"
              aria-expanded={open}
              className={`flex w-full flex-col items-center gap-1 py-2.5 text-[11px] transition-colors active:scale-95 ${
                open || overflowActive ? "text-brand" : "text-muted"
              }`}
            >
              <MoreHorizontal className="h-5 w-5" strokeWidth={open || overflowActive ? 2.25 : 1.75} />
              More
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
