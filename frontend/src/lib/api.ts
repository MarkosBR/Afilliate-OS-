import { AUTH_TOKEN_STORAGE_KEY } from "@affiliateos/shared";
import type {
  AdminDashboard,
  AdminLog,
  AffiliateLink,
  AiGenerateResult,
  AiStatus,
  AnalyticsBreakdown,
  AnalyticsReport,
  AnalyticsSummary,
  AuthPayload,
  Campaign,
  AppNotification,
  CalendarEntry,
  ConnectedAccount,
  Content,
  ContentKind,
  ContentTone,
  DashboardOverview,
  IntegrationPlatform,
  Publication,
  PublicationPlatform,
  LinkStats,
  Paginated,
  Product,
  User,
  UserRole,
  UserStatus,
} from "@affiliateos/shared";

export type HealthResponse = {
  success: true;
  status: "ok" | "degraded";
  database: "connected" | "disconnected";
  timestamp: string;
};

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: { code: string; message: string } };

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken() {
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setToken(token: string | null) {
  if (token) window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  else window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });

  const payload = (await response.json()) as ApiSuccess<T> | ApiFailure | HealthResponse;
  if ("database" in payload) {
    return payload as T;
  }
  if (!("success" in payload) || payload.success !== true) {
    const failure = payload as ApiFailure;
    throw new ApiError(
      response.status,
      failure.error?.code ?? "ERROR",
      failure.error?.message ?? "Request failed",
    );
  }
  return payload.data;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/health", { credentials: "include" });
  if (!response.ok) throw new Error("Health check failed");
  return response.json() as Promise<HealthResponse>;
}

export const api = {
  register: (body: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => request<AuthPayload>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<AuthPayload>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  me: () => request<User>("/api/auth/me"),
  updateProfile: (body: { name?: string; email?: string; avatar?: string | null }) =>
    request<User>("/api/auth/profile", { method: "PATCH", body: JSON.stringify(body) }),
  changePassword: (body: {
    currentPassword: string;
    password: string;
    confirmPassword: string;
  }) => request<{ ok: boolean }>("/api/auth/password", { method: "PATCH", body: JSON.stringify(body) }),

  products: {
    list: () => request<Product[]>("/api/products"),
    get: (id: string) => request<Product>(`/api/products/${id}`),
    create: (body: Partial<Product> & { name: string; platform: Product["platform"]; affiliateUrl: string; commission: number }) =>
      request<Product>("/api/products", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Product>) =>
      request<Product>(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id: string) => request<{ ok: boolean }>(`/api/products/${id}`, { method: "DELETE" }),
  },
  links: {
    list: () => request<AffiliateLink[]>("/api/links"),
    get: (id: string) => request<AffiliateLink>(`/api/links/${id}`),
    stats: (id: string, days = 7) => request<LinkStats>(`/api/links/${id}/stats?days=${days}`),
    create: (body: {
      productId: string;
      name: string;
      url?: string;
      slug?: string;
      status?: AffiliateLink["status"];
      campaignId?: string | null;
    }) => request<AffiliateLink>("/api/links", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<AffiliateLink>) =>
      request<AffiliateLink>(`/api/links/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id: string) => request<{ ok: boolean }>(`/api/links/${id}`, { method: "DELETE" }),
  },
  campaigns: {
    list: () => request<Campaign[]>("/api/campaigns"),
    create: (body: {
      productId: string;
      name: string;
      description?: string | null;
      budget: number;
      status?: Campaign["status"];
    }) => request<Campaign>("/api/campaigns", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Campaign>) =>
      request<Campaign>(`/api/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id: string) => request<{ ok: boolean }>(`/api/campaigns/${id}`, { method: "DELETE" }),
  },
  content: {
    list: () => request<Content[]>("/api/content"),
    get: (id: string) => request<Content>(`/api/content/${id}`),
    create: (body: Partial<Content> & { title: string }) =>
      request<Content>("/api/content", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Content>) =>
      request<Content>(`/api/content/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id: string) => request<{ ok: boolean }>(`/api/content/${id}`, { method: "DELETE" }),
    approve: (id: string) => request<Content>(`/api/content/${id}/approve`, { method: "POST" }),
    reject: (id: string) => request<Content>(`/api/content/${id}/reject`, { method: "POST" }),
    uploadVideo: async (id: string, file: File) => {
      const token = getToken();
      const body = new FormData();
      body.append("video", file);
      const headers = new Headers();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const response = await fetch(`/api/content/${id}/video`, {
        method: "POST",
        headers,
        body,
        credentials: "include",
      });
      const payload = (await response.json()) as { success: true; data: Content } | { success: false; error: { code: string; message: string } };
      if (!("success" in payload) || payload.success !== true) {
        throw new ApiError(response.status, payload.error?.code ?? "ERROR", payload.error?.message ?? "Request failed");
      }
      return payload.data;
    },
    schedule: (
      id: string,
      body: { platform: PublicationPlatform; scheduledAt: string; connectedAccountId?: string | null },
    ) => request<Publication>(`/api/content/${id}/schedule`, { method: "POST", body: JSON.stringify(body) }),
  },
  calendar: {
    list: (params = "") => request<CalendarEntry[]>(`/api/calendar${params}`),
  },
  publications: {
    list: () => request<Publication[]>("/api/publications"),
    get: (id: string) => request<Publication>(`/api/publications/${id}`),
    cancel: (id: string) => request<Publication>(`/api/publications/${id}/cancel`, { method: "POST" }),
    publish: (id: string) => request<Publication>(`/api/publications/${id}/publish`, { method: "POST" }),
  },
  notifications: {
    list: () => request<AppNotification[]>("/api/notifications"),
    markRead: (id: string) => request<AppNotification>(`/api/notifications/${id}/read`, { method: "PATCH" }),
  },
  integrations: {
    list: () => request<ConnectedAccount[]>("/api/integrations"),
    get: (id: string) => request<ConnectedAccount>(`/api/integrations/${id}`),
    status: (id: string) =>
      request<Pick<ConnectedAccount, "id" | "platform" | "status" | "displayName" | "tokenExpiresAt">>(
        `/api/integrations/${id}/status`,
      ),
    connect: (platform: IntegrationPlatform) =>
      request<ConnectedAccount | { authorizationUrl: string }>(`/api/integrations/${platform}/connect`, { method: "POST" }),
    youtubeConnectUrl: "/api/integrations/youtube/connect?json=1",
    disconnect: (id: string) => request<ConnectedAccount>(`/api/integrations/${id}/disconnect`, { method: "POST" }),
  },
  ai: {
    status: () => request<AiStatus>("/api/ai/status"),
    generate: (body: {
      productId: string;
      campaignId?: string | null;
      kind: ContentKind;
      tone?: ContentTone;
      extraContext?: string | null;
    }) => request<AiGenerateResult>("/api/ai/generate", { method: "POST", body: JSON.stringify(body) }),
  },
  analytics: {
    summary: () => request<AnalyticsSummary>("/api/analytics/summary"),
    overview: (days = 7) => request<DashboardOverview>(`/api/analytics/overview?days=${days}`),
    breakdown: (days = 7) => request<AnalyticsBreakdown>(`/api/analytics/breakdown?days=${days}`),
    report: (params: string) => request<AnalyticsReport>(`/api/analytics/report${params}`),
    link: (id: string, params = "") => request<AnalyticsReport & { link: AffiliateLink; recentClicks: LinkStats["recentClicks"] }>(`/api/analytics/links/${id}${params}`),
    campaign: (id: string, params = "") =>
      request<AnalyticsReport & { campaign: Pick<Campaign, "id" | "name" | "status">; links: AffiliateLink[] }>(
        `/api/analytics/campaigns/${id}${params}`,
      ),
  },
  admin: {
    dashboard: () => request<AdminDashboard>("/api/admin/dashboard"),
    users: (params = "") => request<Paginated<User>>(`/api/admin/users${params}`),
    user: (id: string) => request<User>(`/api/admin/users/${id}`),
    updateUser: (id: string, body: { status?: UserStatus; role?: UserRole }) =>
      request<User>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    products: (params = "") =>
      request<Paginated<Product & { owner: Pick<User, "id" | "name" | "email"> }>>(`/api/admin/products${params}`),
    updateProduct: (id: string, body: { status: Product["status"] }) =>
      request<Product>(`/api/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    campaigns: (params = "") =>
      request<Paginated<Campaign & { owner: Pick<User, "id" | "name" | "email"> }>>(`/api/admin/campaigns${params}`),
    logs: (params = "") => request<Paginated<AdminLog>>(`/api/admin/logs${params}`),
    analytics: (params = "") => request<AnalyticsReport>(`/api/admin/analytics${params}`),
  },
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
