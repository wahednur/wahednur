import Link from "next/link";
import { getMainNav } from "@/lib/nav";
import { site } from "@/lib/site";
import Year from "./Year";

export default async function Footer() {
  const mainNav = await getMainNav();
  return (
    <footer className="site-chrome border-t border-line">
      <nav aria-label="Footer" className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 px-4 pt-8 text-sm text-muted sm:px-6">
        {mainNav.map((n) => (
          <Link key={n.href} href={n.href} className="hover:text-ink">
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © 2012 - <Year /> {site.name}
        </p>
        <div className="flex gap-5">
          <a href={site.github} className="hover:text-ink">GitHub</a>
          <a href={site.linkedin} className="hover:text-ink">LinkedIn</a>
          <a href={`mailto:${site.email}`} className="hover:text-ink">Email</a>
        </div>
      </div>
    </footer>
  );
}
