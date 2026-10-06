import Link from "next/link";
import { site } from "@/lib/site";

const nav = [
  { href: "#work", label: "Work" },
  { href: "#services", label: "Services" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-md border border-brand/40 bg-surface font-mono text-sm text-brand">
            wn
          </span>
          <span>Wahed Nur</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-7 text-sm text-muted md:flex">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="transition-colors hover:text-ink">
              {n.label}
            </a>
          ))}
        </nav>
        <a
          href={site.resume}
          className="rounded-md border border-line px-3.5 py-2 text-sm text-ink transition-colors hover:border-brand/60 hover:text-brand"
        >
          Résumé
        </a>
      </div>
    </header>
  );
}
