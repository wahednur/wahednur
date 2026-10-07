// Calls to the data API (/api/...) from the browser. The session cookie is HttpOnly; the page only
// echoes the CSRF token. Every answer is re-checked by the server, the UI is just a mirror.
import { API_URL, csrfToken, ensureCsrf } from "./auth/client";

export type Result<T> = { ok: boolean; status: number; data: T | null; error: string };

function messageOf(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    if (typeof obj.detail === "string") return obj.detail;
    for (const value of Object.values(obj)) {
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
      if (typeof value === "string") return value;
    }
  }
  return fallback;
}

export async function api<T>(method: string, path: string, body?: unknown): Promise<Result<T>> {
  try {
    if (method !== "GET") await ensureCsrf();
    const form = body instanceof FormData;
    const res = await fetch(`${API_URL}/api${path}`, {
      method,
      credentials: "include",
      headers: {
        ...(form || body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(method === "GET" ? {} : { "X-CSRFToken": csrfToken() }),
      },
      body: body === undefined ? undefined : form ? body : JSON.stringify(body),
    });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      /* no body (204) */
    }
    if (res.ok) return { ok: true, status: res.status, data: json as T, error: "" };
    const fallback =
      res.status === 403
        ? "You do not have permission. Staff changes need two-factor authentication."
        : "Something went wrong. Please try again.";
    return { ok: false, status: res.status, data: null, error: messageOf(json, fallback) };
  } catch {
    return { ok: false, status: 0, data: null, error: "Could not reach the server. Try again." };
  }
}

export type Milestone = {
  id: number;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  due_date: string | null;
};
export type Update = { id: number; message: string; is_public: boolean; author_email: string | null; created_at: string };
export type Project = {
  id: string;
  title: string;
  summary: string;
  status: "proposal" | "active" | "on_hold" | "completed" | "cancelled";
  client: number;
  client_email: string;
  progress: number;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
};
export type ProjectDetail = Project & { milestones: Milestone[]; updates: Update[] };
export type Doc = {
  id: string;
  title: string;
  category: string;
  client_email: string | null;
  project: string | null;
  shared_with_client: boolean;
  original_name: string;
  size: number;
  created_at: string;
};
export type ClientRow = { id: number; email: string; full_name: string; company: string };

export const STATUS_LABEL: Record<Project["status"], string> = {
  proposal: "Proposal",
  active: "In progress",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};
// Mirrors the server's allowed moves; the server enforces them anyway.
export const NEXT_STATUS: Record<Project["status"], Project["status"][]> = {
  proposal: ["active", "cancelled"],
  active: ["on_hold", "completed", "cancelled"],
  on_hold: ["active", "cancelled"],
  completed: ["active"],
  cancelled: [],
};
export const CATEGORIES: [string, string][] = [
  ["mou", "MOU"],
  ["tor", "Terms of reference (TOR)"],
  ["agreement", "Agreement"],
  ["quotation", "Quotation"],
  ["invoice", "Invoice"],
  ["receipt", "Receipt"],
  ["other", "Other"],
];
