export type Me = {
  id: number;
  email: string;
  full_name: string;
  roles: string[];
  email_verified: boolean;
  mfa_enabled: boolean;
};

export type Money = { currency: "BDT" | "USD" };
export type AttentionItem = { key: string; label: string; count: number; href: string };
export type DashboardData = {
  role: "staff" | "client";
  attention: AttentionItem[];
  stats: Record<string, number>;
  money: Record<string, { owed: string; overdue: string }>;
  projects: { id: string; title: string; status: string; progress: number; due_date: string | null }[];
  this_month?: Record<string, { received: string; spent: string; net: string }>;
};

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
export type ClientRow = { id: number; email: string; full_name: string; company: string; phone?: string };

export type BillRow = {
  id: string;
  number: string;
  title: string;
  project_title: string;
  client_email: string;
  currency: "BDT" | "USD";
  total: string;
  status: string;
  state?: string;
  outstanding?: string;
  due_date?: string | null;
  valid_until?: string | null;
  invoice_id?: string | null;
  created_at: string;
};
export type Invoice = BillRow & {
  discount: string;
  notes: string;
  subtotal: string;
  items: { description: string; quantity: string; unit_price: string; amount?: string }[];
  paid_total: string;
  installments: { id: number; label: string; amount: string; due_date: string | null; paid: string; state: string }[];
  payments: { id: number; amount: string; method: string; reference: string; paid_on: string; note: string }[];
};

export type PackageOrder = {
  id: string;
  title: string;
  unit_price: string;
  currency: "BDT" | "USD";
  cycle: string;
  note: string;
  status: string;
  client_email: string;
  created_at: string;
};
export type ShopOrder = {
  id: string;
  number: string;
  status: string;
  customer_email: string;
  currency: "BDT" | "USD";
  items: { title: string; kind: string; quantity: number; amount: string }[];
  shipping_fee: string;
  shipping_zone: string | null;
  ship_to: { name: string; phone: string; address: string } | null;
  total: string;
  outstanding: string;
  paid: boolean;
  claimed: { method: string; reference: string; at: string } | null;
  tracking: string;
  created_at: string;
};
export type Subscription = {
  id: number;
  title: string;
  client_email: string;
  unit_price: string;
  currency: "BDT" | "USD";
  cycle: string;
  status: string;
  next_billing_date: string | null;
};
export type Page = {
  id: number;
  kind: "post" | "page";
  slug: string;
  title: string;
  status: "draft" | "published";
  published_at: string | null;
  updated_at: string;
  seo_source: string;
  seo_stale: boolean;
  cover_image: string;
};
export type Summary = Record<
  string,
  { received: string; spent: string; net: string; receivable: string; overdue: string; tax_withheld: string; months: { month: string; received: string; spent: string; net: string }[] }
>;
