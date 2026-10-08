import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth/server";
import AppShell, { type ShellGroup } from "./AppShell";

/** Decides on the server, with the API, whether the visitor may see anything inside /app. */
export default async function AuthGate({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect("/login?reason=expired");

  const owner = me.roles.includes("owner");
  const team = owner || me.roles.includes("staff");
  const groups: ShellGroup[] = [
    {
      title: "Workspace",
      items: [
        { href: "/app", label: "Dashboard", icon: "dashboard" },
        { href: "/app/projects", label: "Projects", icon: "projects" },
        { href: "/app/documents", label: "Documents", icon: "documents" },
      ],
    },
    {
      title: "Money",
      items: [
        { href: "/app/billing", label: "Billing", icon: "billing" },
        { href: "/app/subscriptions", label: "Subscriptions", icon: "subscriptions" },
        ...(owner ? [{ href: "/app/accounting", label: "Accounting", icon: "accounting" }] : []),
      ],
    },
    {
      title: "Orders",
      items: [
        { href: "/app/shop", label: "Shop orders", icon: "orders" },
        { href: "/app/orders", label: "Package requests", icon: "packages" },
      ],
    },
    ...(team
      ? [{
          title: "Team",
          items: [
            { href: "/app/manage", label: "Manage", icon: "manage" },
            { href: "/app/content", label: "Content", icon: "content" },
          ],
        }]
      : []),
    { title: "Account", items: [{ href: "/app/security", label: "Security", icon: "security" }] },
  ];

  return (
    <AppShell groups={groups} user={{ email: me.email, name: me.full_name, roles: me.roles, mfa: me.mfa_enabled }}>
      {children}
    </AppShell>
  );
}
