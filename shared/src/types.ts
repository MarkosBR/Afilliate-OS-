export type Plan = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING";
export type ProductPlatform = "HOTMART" | "EDUZZ" | "KIWIFY" | "OTHER";
export type ProductStatus = "ACTIVE" | "INACTIVE";
export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED";
export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  plan: Plan;
  status: UserStatus;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  platform: ProductPlatform;
  externalId: string | null;
  affiliateUrl: string;
  commission: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
};

export type AffiliateLink = {
  id: string;
  userId: string;
  productId: string;
  name: string;
  slug: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  product?: Pick<Product, "id" | "name" | "platform">;
};

export type Campaign = {
  id: string;
  userId: string;
  productId: string;
  name: string;
  description: string | null;
  budget: number;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
  product?: Pick<Product, "id" | "name" | "platform">;
};

export type AnalyticsSummary = {
  products: number;
  links: number;
  campaigns: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type HealthStatus = {
  success: true;
  status: "ok" | "degraded";
  database: "connected" | "disconnected";
  timestamp: string;
};

export type AuthPayload = {
  user: User;
  token: string;
};
