import { site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© 2026 {site.name}</p>
        <div className="flex gap-5">
          <a href={site.github} className="hover:text-ink">GitHub</a>
          <a href={site.linkedin} className="hover:text-ink">LinkedIn</a>
          <a href={`mailto:${site.email}`} className="hover:text-ink">Email</a>
        </div>
      </div>
    </footer>
  );
}
