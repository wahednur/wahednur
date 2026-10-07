// Browser-side calls to the sign-in API (django-allauth "headless", browser flavour).
// The session lives in an HttpOnly cookie the page can never read; the only thing the page
// handles is the CSRF token, which it echoes back in a header.
import type { ApiError, ApiResult, Flow } from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const BASE = `${API_URL}/_allauth/browser/v1`;

export const isConfigured = () => API_URL !== "";

export function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function ensureCsrf(): Promise<void> {
  if (!csrfToken()) await fetch(`${BASE}/config`, { credentials: "include" });
}

export async function authFetch(method: string, path: string, body?: unknown): Promise<ApiResult> {
  await ensureCsrf();
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken() },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: ApiResult["body"] = null;
    try {
      json = await res.json();
    } catch {
      /* no body */
    }
    return { status: res.status, body: json };
  } catch {
    return { status: 0, body: { errors: [{ message: "Could not reach the server. Try again." }] } };
  }
}

export const errorsOf = (r: ApiResult): ApiError[] => r.body?.errors ?? [];
export const flowsOf = (r: ApiResult): Flow[] => r.body?.data?.flows ?? [];
export const pendingFlow = (r: ApiResult, id: string) =>
  flowsOf(r).find((f) => f.id === id && f.is_pending !== false);
export const isReauthRequired = (r: ApiResult) =>
  r.status === 401 && flowsOf(r).some((f) => f.id === "reauthenticate");

export function firstError(r: ApiResult, fallback = "Something went wrong. Please try again."): string {
  if (r.status === 0) return errorsOf(r)[0]?.message ?? fallback;
  if (r.status === 429) return "Too many attempts. Wait a few minutes and try again.";
  return errorsOf(r)[0]?.message ?? fallback;
}

export async function providers(): Promise<{ id: string; name: string }[]> {
  const r = await authFetch("GET", "/config");
  const list = (r.body?.data as { socialaccount?: { providers?: { id: string; name: string }[] } })
    ?.socialaccount?.providers;
  return list ?? [];
}

/** Hands the browser over to Google. The API answers with a redirect to Google. */
export async function startProviderLogin(provider: string, callbackPath: string) {
  await ensureCsrf();
  const form = document.createElement("form");
  form.method = "POST";
  form.action = `${BASE}/auth/provider/redirect`;
  const fields: Record<string, string> = {
    provider,
    process: "login",
    callback_url: `${window.location.origin}${callbackPath}`,
    csrfmiddlewaretoken: csrfToken(),
  };
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export async function logout(): Promise<void> {
  await authFetch("DELETE", "/auth/session");
}

/** Only same-site paths: never follow a `?next=` that points elsewhere. */
export function safeNext(next: string | null | undefined, fallback = "/app"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
