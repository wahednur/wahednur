import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth/server";
import AppNav, { type NavItem } from "./AppNav";
import SignOutButton from "./SignOutButton";

/** Decides on the server, with the API, whether the visitor may see anything inside /app. */
export default async function AuthGate({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect("/login?reason=expired");

  const team = me.roles.includes("owner") || me.roles.includes("staff");
  const items: NavItem[] = [
    { href: "/app", label: "Dashboard" },
    { href: "/app/projects", label: "Projects" },
    { href: "/app/billing", label: "Billing" },
    { href: "/app/documents", label: "Documents" },
    { href: "/app/shop", label: "Orders" },
    { href: "/app/orders", label: "Package requests" },
    { href: "/app/subscriptions", label: "Subscriptions" },
    ...(me.roles.includes("owner") ? [{ href: "/app/accounting", label: "Accounting" }] : []),
    ...(team ? [{ href: "/app/manage", label: "Manage" }, { href: "/app/content", label: "Content" }] : []),
    { href: "/app/security", label: "Security" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <AppNav items={items} />
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-muted sm:inline">{me.email}</span>
          <SignOutButton />
        </div>
      </div>
      <div className="pt-8">{children}</div>
    </div>
  );
}
