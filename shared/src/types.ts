export type Plan = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING";
export type UserRole = "USER" | "ADMIN";
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
  role: UserRole;
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
  activeProducts: number;
  activeCampaigns: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
};

export type DashboardPoint = {
  date: string;
  clicks: number;
  conversions: number;
  revenue: number;
};

export type DashboardOverview = {
  summary: AnalyticsSummary;
  series: DashboardPoint[];
  recentCampaigns: Campaign[];
  topProducts: Array<Product & { conversions: number; revenue: number }>;
  recentActivity: Array<{
    id: string;
    type: "CLICK" | "CONVERSION" | "PRODUCT" | "CAMPAIGN" | "LINK";
    label: string;
    createdAt: string;
  }>;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminDashboard = {
  users: number;
  activeUsers: number;
  newUsers: number;
  products: number;
  campaigns: number;
  links: number;
  recentLogs: AdminLog[];
};

export type AdminLog = {
  id: string;
  adminUserId: string;
  action: string;
  targetUserId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  admin?: Pick<User, "id" | "name" | "email">;
  target?: Pick<User, "id" | "name" | "email"> | null;
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
