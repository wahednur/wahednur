import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { api, SITE_URL } from "@/lib/http";
import { Button } from "./ui";

type Item = { to: string; label: string; owner?: boolean };
const ITEMS: Item[] = [
  { to: "/", label: "Overview" },
  { to: "/conversations", label: "Conversations" },
  { to: "/messages", label: "Enquiries" },
  { to: "/projects", label: "Projects" },
  { to: "/billing", label: "Billing" },
  { to: "/services", label: "Services & packages" },
  { to: "/requests", label: "Package requests" },
  { to: "/shop", label: "Shop orders" },
  { to: "/products", label: "Products & delivery" },
  { to: "/subscriptions", label: "Subscriptions" },
  { to: "/documents", label: "Documents" },
  { to: "/clients", label: "Clients" },
  { to: "/content", label: "Content" },
  { to: "/accounting", label: "Accounting", owner: true },
];

export default function Shell() {
  const { me, signOut, isOwner } = useAuth();
  const [open, setOpen] = useState(false);
  const items = ITEMS.filter((i) => !i.owner || isOwner);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    // Unread customer chats, shown as a badge on "Conversations". Quiet while the tab is hidden.
    const check = async () => {
      if (document.hidden) return;
      const r = await api<{ unread: number }[]>("GET", "/conversations/");
      if (r.ok && r.data) setUnread(r.data.reduce((n, c) => n + c.unread, 0));
    };
    const first = setTimeout(check, 0);
    const id = setInterval(check, 60000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);

  const nav = (
    <nav aria-label="Main" className="space-y-1 p-3">
      {items.map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          end={i.to === "/"}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `block rounded-lg px-3 py-2 text-sm ${isActive ? "bg-brand/15 font-medium text-brand" : "text-muted hover:bg-surface-2 hover:text-ink"}`
          }
        >
          {i.label}
          {i.to === "/conversations" && unread > 0 && (
            <span className="ml-2 rounded-full bg-amber-400 px-1.5 py-0.5 font-mono text-[10px] font-bold text-bg">{unread}</span>
          )}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-full">
      <aside className="hidden w-60 shrink-0 border-r border-line bg-surface lg:block">
        <div className="px-6 py-5 text-lg font-semibold tracking-tight">
          Wahed Nur <span className="font-mono text-[11px] text-brand">admin</span>
        </div>
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-black/60" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 overflow-y-auto bg-surface">{nav}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button className="lg:hidden" small onClick={() => setOpen(true)} aria-label="Open menu">
              Menu
            </Button>
            {SITE_URL && (
              <a href={SITE_URL} target="_blank" rel="noreferrer" className="text-sm text-muted hover:text-brand">
                View site ↗
              </a>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{me?.email}</span>
            <Button small onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
