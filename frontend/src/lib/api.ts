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

/** Downloads a protected file (PDF) through the session cookie and hands it to the browser. */
export async function downloadFile(path: string, fallbackName: string): Promise<string> {
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

export type BillItem = { id?: number; description: string; quantity: string; unit_price: string; cycle: string; amount?: string };
export type BillBase = {
  id: string;
  number: string;
  title: string;
  project: string;
  project_title: string;
  client_email: string;
  currency: "BDT" | "USD";
  discount: string;
  notes: string;
  status: string;
  subtotal: string;
  total: string;
  items: BillItem[];
  created_at: string;
};
export type Quotation = BillBase & {
  valid_until: string | null;
  invoice_id: string | null;
};
export type InstallmentRow = { id: number; label: string; amount: string; due_date: string | null; paid: string; state: string };
export type PaymentRow = { id: number; amount: string; method: string; reference: string; paid_on: string; note: string };
export type Invoice = BillBase & {
  state: string;
  due_date: string | null;
  quotation_id: string | null;
  paid_total: string;
  outstanding: string;
  installments: InstallmentRow[];
  payments: PaymentRow[];
};

/** Display only: the server calculated the number, this just formats it. */
export const fmt = (currency: string, value: string) =>
  `${currency === "USD" ? "$" : "৳"}${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PLANS: Record<string, { label: string; steps: { label: string; percent: string }[] }> = {
  full: { label: "Full payment", steps: [{ label: "Full payment", percent: "100" }] },
  half: { label: "50% start, 50% final", steps: [{ label: "Start", percent: "50" }, { label: "Final", percent: "50" }] },
  three: {
    label: "40% start, 30% middle, 30% final",
    steps: [
      { label: "Start", percent: "40" },
      { label: "Middle", percent: "30" },
      { label: "Final", percent: "30" },
    ],
  },
};
export const METHODS: [string, string][] = [
  ["bank", "Bank transfer"],
  ["bkash", "bKash"],
  ["nagad", "Nagad"],
  ["cash", "Cash"],
  ["card", "Card or gateway"],
  ["other", "Other"],
];

export type Expense = {
  id: number;
  spent_on: string;
  category: string;
  amount: string;
  currency: "BDT" | "USD";
  vendor: string;
  description: string;
  project: string | null;
  project_title: string | null;
};
export type CurrencySummary = {
  received: string;
  spent: string;
  net: string;
  receivable: string;
  overdue: string;
  months: { month: string; received: string; spent: string; net: string }[];
};
export type ProjectProfit = {
  project: string;
  title: string;
  currency: "BDT" | "USD";
  invoiced: string;
  received: string;
  spent: string;
  net: string;
};
export const EXPENSE_CATEGORIES: [string, string][] = [
  ["hosting", "Hosting and servers"],
  ["domain", "Domains"],
  ["software", "Software and tools"],
  ["contractor", "Contractors"],
  ["marketing", "Marketing"],
  ["transport", "Transport"],
  ["fees", "Platform and bank fees"],
  ["tax", "Tax and licences"],
  ["other", "Other"],
];

export type PackageInfo = {
  id: number;
  name: string;
  tagline: string;
  features: string[];
  price: string;
  currency: "BDT" | "USD";
  cycle: "one_time" | "monthly" | "yearly";
  delivery_days: number | null;
  revisions: number | null;
};
export type ServiceInfo = { slug: string; title: string; summary: string; description: string; packages: PackageInfo[] };
export type OrderRow = {
  id: string;
  title: string;
  unit_price: string;
  currency: "BDT" | "USD";
  cycle: string;
  note: string;
  status: "requested" | "accepted" | "declined" | "cancelled";
  client_email: string;
  project: string | null;
};
export type SubscriptionRow = {
  id: number;
  title: string;
  client_email: string;
  project: string;
  unit_price: string;
  currency: "BDT" | "USD";
  cycle: "monthly" | "yearly";
  status: "active" | "paused" | "cancelled";
  start_date: string;
  next_billing_date: string | null;
  invoices: string[];
};
export const CYCLE_LABEL: Record<string, string> = { one_time: "one time", monthly: "per month", yearly: "per year" };

export type ManagedPage = {
  id: number;
  kind: "post" | "page";
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  status: "draft" | "published";
  published_at: string | null;
  seo_title: string;
  seo_description: string;
  seo_source: "none" | "rule" | "ai" | "manual";
  seo_locked: boolean;
  seo_stale: boolean;
};
export const SEO_SOURCE_LABEL: Record<ManagedPage["seo_source"], string> = {
  none: "Not written yet",
  rule: "Written by rules",
  ai: "Written by AI from your text",
  manual: "Written by hand",
};

export type ShopProduct = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  kind: "digital" | "physical";
  price: string;
  currency: "BDT" | "USD";
  image_url: string;
  in_stock: boolean;
};
export type Zone = { id: number; name: string; fee: string; currency: "BDT" | "USD" };
export type ShopOrderOut = {
  id: string;
  number: string;
  status: "awaiting_payment" | "payment_review" | "processing" | "shipped" | "delivered" | "completed" | "cancelled";
  customer_email: string;
  currency: "BDT" | "USD";
  items: { title: string; kind: "digital" | "physical"; unit_price: string; quantity: number; amount: string }[];
  shipping_fee: string;
  shipping_zone: string | null;
  ship_to: { name: string; phone: string; address: string } | null;
  note: string;
  total: string;
  outstanding: string;
  paid: boolean;
  invoice: string;
  payment_note: string;
  claimed: { method: string; reference: string; at: string } | null;
  expires_at: string | null;
  tracking: string;
  shipped_at: string | null;
  delivered_at: string | null;
  has_downloads: boolean;
  created_at: string;
};
export const ORDER_STATUS_LABEL: Record<ShopOrderOut["status"], string> = {
  awaiting_payment: "Waiting for payment",
  payment_review: "Checking your payment",
  processing: "Being prepared",
  shipped: "On the way",
  delivered: "Delivered",
  completed: "Complete",
  cancelled: "Cancelled",
};
