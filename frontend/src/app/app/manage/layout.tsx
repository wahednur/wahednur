import Link from "next/link";
import { getMe } from "@/lib/auth/server";
import { isStaff } from "@/lib/auth/roles";

const TABS: [string, string][] = [
  ["/app/manage/catalog", "Services and packages"],
  ["/app/manage/products", "Products"],
  ["/app/manage/zones", "Delivery areas"],
  ["/app/manage/clients", "Clients"],
];

export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const me = (await getMe())!;
  if (!isStaff(me)) return <p className="text-sm text-muted">This area is for staff.</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Manage</h1>
      <nav aria-label="Manage" className="flex flex-wrap gap-2 text-sm">
        {TABS.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-md border border-line px-3 py-1.5 hover:border-brand/60">
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
