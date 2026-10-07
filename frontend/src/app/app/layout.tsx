import type { Metadata } from "next";
import { Suspense } from "react";
import AuthGate from "@/components/auth/AuthGate";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | Dashboard" },
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted sm:px-6" role="status">
          Loading…
        </div>
      }
    >
      <AuthGate>{children}</AuthGate>
    </Suspense>
  );
}
