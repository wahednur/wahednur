"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/app/dashboard/Icons";
import { ago, api, type AppNotification } from "@/lib/api";

const POLL_MS = 60_000;

/** The bell: a small unread counter that refreshes quietly, and a list of the latest news on click. */
export default function NotificationBell() {
  const router = useRouter();
  const path = usePathname();
  const [unread, setUnread] = useState(0);
  const [messages, setMessages] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const count = useCallback(async () => {
    if (document.hidden) return;
    const r = await api<{ unread: number; messages: number }>("GET", "/notifications/unread/");
    if (r.ok && r.data) {
      setUnread(r.data.unread);
      setMessages(r.data.messages);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(count, 0);
    const id = setInterval(count, POLL_MS);
    document.addEventListener("visibilitychange", count);
    window.addEventListener("wn:notifications", count);
    return () => {
      window.removeEventListener("wn:notifications", count);
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", count);
    };
  }, [count]);

  // Moving to another page is a good moment to refresh the number (for example after reading a message).
  useEffect(() => {
    const t = setTimeout(count, 300);
    return () => clearTimeout(t);
  }, [path, count]);

  useEffect(() => {
    if (!open) return;
    api<{ items: AppNotification[]; unread: number }>("GET", "/notifications/?limit=8").then((r) => r.ok && r.data && setItems(r.data.items));
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  async function readAll() {
    await api("POST", "/notifications/read/", {});
    setUnread(0);
    setItems((l) => l && l.map((n) => ({ ...n, read: true })));
  }
  async function go(n: AppNotification) {
    setOpen(false);
    if (!n.read) {
      await api("POST", "/notifications/read/", { ids: [n.id] });
      setUnread((u) => Math.max(0, u - 1));
    }
    if (n.url) router.push(n.url);
  }

  const total = unread;
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={total ? `Notifications, ${total} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="relative grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition-colors hover:border-brand/60 hover:text-ink"
      >
        <Icon name="bell" size={18} />
        {total > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-amber-400 px-1 font-mono text-[10px] font-bold text-bg">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/40 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && <button onClick={readAll} className="text-xs text-brand hover:underline">Mark all read</button>}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {!items ? (
              <li className="p-4 text-sm text-muted">Loading…</li>
            ) : items.length === 0 ? (
              <li className="p-6 text-center text-sm text-muted">Nothing yet. Updates on your projects will show up here.</li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <button onClick={() => go(n)} className={`flex w-full gap-3 border-b border-line/60 px-4 py-3 text-left transition-colors hover:bg-surface-2 ${n.read ? "" : "bg-brand/[0.05]"}`}>
                    <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-brand"}`} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{n.title}</span>
                      {n.body && <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted">{n.body}</span>}
                      <span className="mt-1 block font-mono text-[10px] text-muted">{ago(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="flex justify-between border-t border-line px-4 py-2.5 text-xs">
            <Link href="/app/notifications" onClick={() => setOpen(false)} className="text-brand hover:underline">See all</Link>
            <Link href="/app/messages" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
              Messages{messages > 0 ? ` (${messages} new)` : ""}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
