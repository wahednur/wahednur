import { redirect } from "next/navigation";
import Link from "next/link";
import { getMe } from "@/lib/auth/server";
import SignOutButton from "./SignOutButton";

/** Decides on the server, with the API, whether the visitor may see anything inside /app. */
export default async function AuthGate({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect("/login?reason=expired");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <nav aria-label="Dashboard" className="flex gap-5 text-sm">
          <Link href="/app" className="font-medium hover:text-brand">
            Dashboard
          </Link>
          <Link href="/app/projects" className="text-muted hover:text-ink">
            Projects
          </Link>
          <Link href="/app/billing" className="text-muted hover:text-ink">
            Billing
          </Link>
          {me.roles.includes("owner") && (
            <Link href="/app/accounting" className="text-muted hover:text-ink">
              Accounting
            </Link>
          )}
          <Link href="/app/documents" className="text-muted hover:text-ink">
            Documents
          </Link>
          <Link href="/app/security" className="text-muted hover:text-ink">
            Security
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted">{me.email}</span>
          <SignOutButton />
        </div>
      </div>
      <div className="pt-8">{children}</div>
    </div>
  );
}
