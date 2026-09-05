export type HealthResponse = {
  success: true;
  status: "ok" | "degraded";
  database: "connected" | "disconnected";
  timestamp: string;
};

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/health");
  if (!response.ok) {
    throw new Error("Health check failed");
  }
  return response.json() as Promise<HealthResponse>;
}
