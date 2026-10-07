"use client";

import { useEffect, useState } from "react";
import { isConfigured, providers, startProviderLogin } from "@/lib/auth/client";

/** Shown only when the API has Google switched on. */
export default function GoogleButton({ callbackPath }: { callbackPath: string }) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (!isConfigured()) return;
    providers().then((list) => setAvailable(list.some((p) => p.id === "google")));
  }, []);
  if (!available) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => startProviderLogin("google", callbackPath)}
        className="flex w-full items-center justify-center gap-3 rounded-md border border-line px-5 py-3 text-sm font-semibold hover:border-brand/60"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.7 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z"/>
          <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.9-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z"/>
          <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.6l-7.5-5.8c-2 1.4-4.7 2.3-7.7 2.3-6.3 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/>
        </svg>
        Continue with Google
      </button>
      <div className="flex items-center gap-3 text-xs text-muted" aria-hidden>
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
    </>
  );
}
