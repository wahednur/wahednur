"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/auth/client";

export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await logout();
        router.replace("/login");
        router.refresh();
      }}
      className="rounded-md border border-line px-3 py-1.5 text-sm hover:border-brand/60 hover:text-brand disabled:opacity-60"
    >
      Sign out
    </button>
  );
}
