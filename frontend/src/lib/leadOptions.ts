// Values must match backend/leads/models.py (Lead.Need / Budget / Timeline).
export const needs = [
  { value: "ecommerce", label: "Online store (eCommerce)" },
  { value: "business_app", label: "Business management app" },
  { value: "admin_dashboard", label: "Admin dashboard" },
  { value: "backend_api", label: "Backend API or integration" },
  { value: "improve_existing", label: "Improve an existing app" },
  { value: "other", label: "Something else" },
] as const;

export const budgets = [
  { value: "unsure", label: "Not sure yet" },
  { value: "under_500", label: "Under $500" },
  { value: "500_1500", label: "$500 – $1,500" },
  { value: "1500_5000", label: "$1,500 – $5,000" },
  { value: "over_5000", label: "$5,000+" },
] as const;

export const timelines = [
  { value: "flexible", label: "Flexible" },
  { value: "within_1m", label: "Within 1 month" },
  { value: "1_3m", label: "1 – 3 months" },
  { value: "over_3m", label: "3+ months" },
] as const;
