"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_URL, isConfigured } from "@/lib/auth/client";

const link =
  "rounded-md border border-line px-3.5 py-2 text-sm text-ink transition-colors hover:border-brand/60 hover:text-brand";

/** Sign in / Dashboard link for the public header. The header stays static; this fills in later. */
export default function AuthNav() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (!isConfigured()) return;
    fetch(`${API_URL}/api/auth/me/`, { credentials: "include" })
      .then((r) => setSignedIn(r.ok))
      .catch(() => setSignedIn(false));
  }, []);
  if (!isConfigured()) return null;
  return signedIn ? (
    <Link href="/app" className={link}>
      Dashboard
    </Link>
  ) : (
    <Link href="/login" className={link}>
      Sign in
    </Link>
  );
}
