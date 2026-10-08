export type Me = {
  id: number;
  email: string;
  full_name: string;
  roles: string[];
  email_verified: boolean;
  has_password: boolean;
  mfa_enabled: boolean;
  has_shop_orders: boolean;
  has_package_orders: boolean;
};

export type ApiError = { message: string; code?: string; param?: string };
export type Flow = { id: string; is_pending?: boolean; types?: string[] };
export type ApiResult = {
  status: number;
  body: {
    status?: number;
    data?: Record<string, unknown> & { flows?: Flow[] };
    meta?: Record<string, unknown> & { is_authenticated?: boolean };
    errors?: ApiError[];
  } | null;
};
