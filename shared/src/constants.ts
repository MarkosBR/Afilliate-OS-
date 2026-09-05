export const APP_NAME = "AffiliateOS";
export const APP_TAGLINE = "Seu sistema operacional para afiliados.";

export const API_PREFIX = "/api";

export const API_ROUTES = {
  health: "/api/health",
  auth: "/api/auth",
  users: "/api/users",
  products: "/api/products",
  campaigns: "/api/campaigns",
  content: "/api/content",
  analytics: "/api/analytics",
  leads: "/api/leads",
  sales: "/api/sales",
  ai: "/api/ai",
  integrations: "/api/integrations",
  notifications: "/api/notifications",
} as const;

export const PLANS = ["FREE", "STARTER", "PRO", "ENTERPRISE"] as const;
export const USER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"] as const;
