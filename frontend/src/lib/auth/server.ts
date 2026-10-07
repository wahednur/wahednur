import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Me } from "./types";

export const SESSION_COOKIE = "wn_sid";
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

/**
 * Who is signed in, checked with the API (the real source of truth). Returns null for anyone
 * who is not. Pages use this to decide what to show; the API still checks every data request.
 */
export const getMe = cache(async (): Promise<Me | null> => {
  const jar = await cookies();
  if (!API_URL || !jar.get(SESSION_COOKIE)) return null;
  try {
    const res = await fetch(`${API_URL}/api/auth/me/`, {
      headers: { cookie: jar.toString() },
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as Me) : null;
  } catch {
    return null;
  }
});
