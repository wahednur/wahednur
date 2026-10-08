"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/lib/auth/client";

type Props = { email: string; name: string; roles: string[] };

const item = "block w-full rounded-md px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink";

/** Avatar button with a small menu: profile, settings, security and sign out. */
export default function UserMenu({ email, name, roles }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const close = () => setOpen(false);
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-2.5 transition-colors hover:border-brand/60"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand/15 text-sm font-semibold text-brand" aria-hidden>
          {(name || email).charAt(0).toUpperCase()}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-2xl shadow-black/40">
          <div className="border-b border-line px-3 pb-3 pt-2">
            <p className="truncate text-sm font-medium">{name || "Your account"}</p>
            <p className="truncate text-xs text-muted">{email}</p>
            {roles.length > 0 && <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-brand">{roles.join(" · ")}</p>}
          </div>
          <div className="py-1.5">
            <Link role="menuitem" href="/app/profile" onClick={close} className={item}>Profile</Link>
            <Link role="menuitem" href="/app/settings" onClick={close} className={item}>Settings</Link>
            <Link role="menuitem" href="/app/security" onClick={close} className={item}>Security</Link>
          </div>
          <div className="border-t border-line pt-1.5">
            <button
              role="menuitem"
              type="button"
              disabled={busy}
              className={`${item} disabled:opacity-60`}
              onClick={async () => {
                setBusy(true);
                await logout();
                router.replace("/login");
                router.refresh();
              }}
            >
              {busy ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
