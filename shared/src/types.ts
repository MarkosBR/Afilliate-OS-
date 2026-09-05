export type Plan = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING";

export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  plan: Plan;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
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
