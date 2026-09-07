export type Plan = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING";
export type UserRole = "USER" | "ADMIN";
export type ProductPlatform = "HOTMART" | "EDUZZ" | "KIWIFY" | "OTHER";
export type ProductStatus = "ACTIVE" | "INACTIVE";
export type LinkStatus = "ACTIVE" | "INACTIVE";
export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED";
export type ContentStatus = "DRAFT" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "FAILED" | "ARCHIVED";
export type ContentKind = "POST" | "CAPTION" | "AD" | "PRODUCT_DESCRIPTION" | "SCRIPT";
export type ContentSource = "MANUAL" | "AI";
export type ContentTone = "professional" | "casual" | "persuasive" | "urgent" | "friendly";
export type PublicationPlatform = "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "FACEBOOK" | "OTHER";
export type PublicationStatus = "PENDING" | "SCHEDULED" | "READY" | "PUBLISHED" | "FAILED" | "CANCELLED";
export type NotificationType =
  | "CONTENT_APPROVED"
  | "CONTENT_REJECTED"
  | "CONTENT_SCHEDULED"
  | "PUBLICATION_FAILED"
  | "PUBLICATION_PUBLISHED";

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
  linksCount?: number;
  clicks?: number;
};

export type AffiliateLink = {
  id: string;
  userId: string;
  productId: string;
  campaignId: string | null;
  name: string;
  slug: string;
  url: string;
  status: LinkStatus;
  clicks: number;
  trackUrl: string;
  createdAt: string;
  updatedAt: string;
  product?: Pick<Product, "id" | "name" | "platform">;
  campaign?: { id: string; name: string; status: CampaignStatus } | null;
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

export type Content = {
  id: string;
  userId: string;
  productId: string | null;
  campaignId: string | null;
  linkId: string | null;
  title: string;
  body: string | null;
  kind: ContentKind;
  channel: string | null;
  status: ContentStatus;
  source: ContentSource;
  generatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  product?: Pick<Product, "id" | "name" | "platform"> | null;
  campaign?: { id: string; name: string; status: CampaignStatus } | null;
  link?: { id: string; name: string; slug: string } | null;
  publications?: Publication[];
};

export type Publication = {
  id: string;
  userId: string;
  contentId: string;
  platform: PublicationPlatform;
  scheduledAt: string;
  status: PublicationStatus;
  publishedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  content?: Pick<Content, "id" | "title" | "status" | "kind" | "linkId">;
};

export type CalendarEntry = Publication & {
  content: Pick<Content, "id" | "title" | "status" | "kind" | "linkId">;
};

export type AppNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

export type AiGenerateResult = {
  title: string;
  body: string;
  titles: string[];
  description: string;
  provider: string;
  kind: ContentKind;
  tone: string;
};

export type AiStatus = {
  configured: boolean;
  provider: string | null;
};

export type AnalyticsSummary = {
  products: number;
  links: number;
  campaigns: number;
  activeProducts: number;
  activeCampaigns: number;
  activeLinks: number;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
};

export type AnalyticsCount = { label: string; count: number };

export type AnalyticsReport = {
  from: string;
  to: string;
  summary: {
    clicks: number;
    uniqueClicks: number;
    activeLinks: number;
    activeCampaigns: number;
    topSource: string;
  };
  series: DashboardPoint[];
  topLinks: Array<{ id: string; name: string; slug?: string; clicks: number }>;
  topCampaigns: Array<{ id: string; name: string; clicks: number }>;
  topSources: AnalyticsCount[];
  topReferrers: AnalyticsCount[];
  utmSources: AnalyticsCount[];
  utmMediums: AnalyticsCount[];
  utmCampaigns: AnalyticsCount[];
  totals?: AnalyticsSummary;
  clicksByProduct?: Array<{ id: string; name: string; clicks: number }>;
  clicksByLink?: Array<{ id: string; name: string; slug: string; clicks: number; totalClicks: number }>;
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
  topLinks: Array<{
    id: string;
    name: string;
    slug: string;
    clicks: number;
    status: LinkStatus;
    product?: Pick<Product, "id" | "name" | "platform">;
  }>;
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
  activeLinks: number;
  clicks: number;
  topProducts: Array<{ id: string; name: string; clicks: number }>;
  recentClicks: Array<{ id: string; createdAt: string; label: string }>;
  recentLogs: AdminLog[];
};

export type LinkStats = {
  link: AffiliateLink;
  clicks: number;
  periodClicks: number;
  recentClicks: Array<{
    id: string;
    createdAt: string;
    referrer: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    utmContent: string | null;
    utmTerm: string | null;
  }>;
  origins: Array<{ label: string; count: number }>;
  utmCampaigns: Array<{ label: string; count: number }>;
};

export type AnalyticsBreakdown = {
  summary: AnalyticsSummary;
  days: number;
  clicksByProduct: Array<{ id: string; name: string; clicks: number }>;
  clicksByLink: Array<{ id: string; name: string; slug: string; clicks: number; totalClicks: number }>;
  origins: Array<{ label: string; count: number }>;
  utmCampaigns: Array<{ label: string; count: number }>;
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
