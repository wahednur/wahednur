"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "@/components/app/dashboard/Icons";
import UserMenu from "./UserMenu";

export type ShellItem = { href: string; label: string; icon: string };
export type ShellGroup = { title: string; items: ShellItem[] };
export type ShellUser = { email: string; name: string; roles: string[]; mfa: boolean };

const isActive = (path: string, href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));

function Nav({ groups, path, onGo }: { groups: ShellGroup[]; path: string; onGo?: () => void }) {
  return (
    <nav aria-label="Dashboard" className="space-y-6">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted/70">{g.title}</p>
          <ul className="mt-2 space-y-0.5">
            {g.items.map((it) => {
              const on = isActive(path, it.href);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={onGo}
                    aria-current={on ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      on ? "bg-brand/10 font-medium text-brand" : "text-muted hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-brand transition-opacity ${
                        on ? "opacity-100 shadow-[0_0_12px_2px_rgba(45,212,191,0.55)]" : "opacity-0"
                      }`}
                    />
                    <span className={on ? "text-brand" : "text-muted/80 group-hover:text-ink"}>
                      <Icon name={it.icon} />
                    </span>
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SecureCard({ user }: { user: ShellUser }) {
  return (
    <div className="rounded-xl border border-brand/20 bg-brand/[0.05] p-3.5 text-xs">
      <p className="flex items-center gap-2 font-medium text-ink">
        <span className="pulse-dot relative h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
        Protected session
      </p>
      <ul className="mt-2.5 space-y-1.5 text-muted">
        <li className="flex items-center gap-2">
          <span className="text-brand"><Icon name="lock" size={15} /></span>Encrypted connection
        </li>
        <li className="flex items-center gap-2">
          <span className={user.mfa ? "text-brand" : "text-amber-300"}><Icon name="security" size={15} /></span>
          {user.mfa ? "Two-step sign-in is on" : (
            <Link href="/app/security" className="text-amber-200 hover:underline">Two-step sign-in is off</Link>
          )}
        </li>
      </ul>
    </div>
  );
}

/** The signed-in frame: sidebar, top bar and footer. It replaces the public site's header and footer. */
export default function AppShell({ groups, user, children }: { groups: ShellGroup[]; user: ShellUser; children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const flat = groups.flatMap((g) => g.items);
  const here = [...flat].sort((a, b) => b.href.length - a.href.length).find((i) => isActive(path, i.href));

  useEffect(() => {
    const t = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(t);
  }, [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open]);

  const brand = (
    <Link href="/app" className="flex items-center gap-2.5 px-3">
      <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-md border border-brand/40">
        <Image src="/wahednur.jpg" alt="" width={64} height={64} className="h-full w-full object-cover" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-tight">Wahed Nur</span>
        <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-brand">My account</span>
      </span>
    </Link>
  );

  return (
    <div className="relative flex min-h-screen bg-bg">
      {/* Desktop sidebar */}
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-line bg-surface/60 px-3 py-5 lg:flex">
        {brand}
        <div className="-mr-1 flex-1 overflow-y-auto pr-1 pl-3"><div className="-ml-3"><Nav groups={groups} path={path} /></div></div>
        <SecureCard user={user} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="no-print fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto border-r border-line bg-bg px-3 py-5">
            <div className="flex items-center justify-between">
              {brand}
              <button aria-label="Close menu" onClick={() => setOpen(false)} className="rounded-md p-2 text-muted hover:text-ink"><Icon name="close" /></button>
            </div>
            <div className="flex-1 pl-3"><div className="-ml-3"><Nav groups={groups} path={path} onGo={() => setOpen(false)} /></div></div>
            <SecureCard user={user} />
          </div>
        </div>
      )}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div aria-hidden className="bg-grid no-print pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60 [mask-image:linear-gradient(#000,transparent)]" />
        <div aria-hidden className="no-print pointer-events-none absolute -top-24 right-10 h-56 w-[28rem] rounded-full bg-brand/10 blur-3xl" />

        {/* Top bar */}
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur sm:px-6">
          <button aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)} className="-ml-2 rounded-md p-2 text-muted hover:text-ink lg:hidden">
            <Icon name="menu" />
          </button>
          <p className="min-w-0 flex-1 truncate text-sm">
            <span className="hidden text-muted sm:inline">My account / </span>
            <span className="font-medium">{here?.label ?? "Dashboard"}</span>
          </p>
          <span className="hidden items-center gap-1.5 rounded-full border border-brand/30 bg-brand/[0.07] px-2.5 py-1 font-mono text-[11px] text-brand sm:inline-flex">
            <Icon name="lock" size={13} /> Secure
          </span>
          <Link href="/" className="hidden rounded-md px-2.5 py-1.5 text-sm text-muted hover:text-ink md:block">Website</Link>
          <div className="border-l border-line pl-3">
            <UserMenu email={user.email} name={user.name} roles={user.roles.filter((r) => r !== "client")} />
          </div>
        </header>

        <main id="app-main" className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>

        {/* Footer */}
        <footer className="no-print border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="flex items-center gap-2">
              <span className="text-brand"><Icon name="lock" size={15} /></span>
              Your files and invoices are private to you. Downloads use short-lived links.
            </p>
            <nav aria-label="Account footer" className="flex flex-wrap gap-x-5 gap-y-1">
              <Link href="/app/security" className="hover:text-ink">Security</Link>
              <Link href="/contact" className="hover:text-ink">Contact me</Link>
              <Link href="/" className="hover:text-ink">Back to website</Link>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
}
