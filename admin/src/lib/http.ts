// Calls to the API from the browser. The session cookie is HttpOnly and set by the API; this app only
// echoes the CSRF token. Every answer is checked again by the server, the screens are just a mirror.
export const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? "").replace(/\/$/, "");
const AUTH = `${API_URL}/_allauth/browser/v1`;

export type Result<T> = { ok: boolean; status: number; data: T | null; error: string };

function csrfToken(): string {
  const m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}
async function ensureCsrf() {
  if (!csrfToken()) await fetch(`${AUTH}/config`, { credentials: "include" });
}

function messageOf(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    if (typeof obj.detail === "string") return obj.detail;
    const errors = obj.errors as { message?: string }[] | undefined;
    if (errors?.[0]?.message) return errors[0].message;
    for (const v of Object.values(obj)) {
      if (Array.isArray(v) && typeof v[0] === "string") return v[0];
      if (typeof v === "string") return v;
    }
  }
  return fallback;
}

async function call<T>(base: string, method: string, path: string, body?: unknown): Promise<Result<T> & { raw: unknown }> {
  try {
    if (method !== "GET") await ensureCsrf();
    const res = await fetch(`${base}${path}`, {
      method,
      credentials: "include",
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(method === "GET" ? {} : { "X-CSRFToken": csrfToken() }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      /* no body */
    }
    const fallback =
      res.status === 403
        ? "You do not have permission. Staff changes need two-factor sign-in."
        : res.status === 429
          ? "Too many attempts. Wait a few minutes and try again."
          : "Something went wrong. Please try again.";
    return res.ok
      ? { ok: true, status: res.status, data: json as T, error: "", raw: json }
      : { ok: false, status: res.status, data: null, error: messageOf(json, fallback), raw: json };
  } catch {
    return { ok: false, status: 0, data: null, error: "Could not reach the server. Try again.", raw: null };
  }
}

export const api = <T,>(method: string, path: string, body?: unknown) => call<T>(`${API_URL}/api`, method, path, body);
export const authCall = (method: string, path: string, body?: unknown) => call<unknown>(AUTH, method, path, body);

/** Downloads a protected file (an invoice PDF) through the session cookie. */
export async function download(path: string, fallbackName: string): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/api${path}`, { credentials: "include" });
    if (!res.ok) return "Could not download the file.";
    const blob = await res.blob();
    const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? fallbackName;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return "";
  } catch {
    return "Could not reach the server. Try again.";
  }
}
