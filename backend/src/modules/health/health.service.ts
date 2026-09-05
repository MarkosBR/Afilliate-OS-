import { prisma } from "../../lib/prisma.js";

export type HealthPayload = {
  success: true;
  status: "ok" | "degraded";
  database: "connected" | "disconnected";
  timestamp: string;
};

export async function getHealth(): Promise<HealthPayload> {
  let database: "connected" | "disconnected" = "disconnected";

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "connected";
  } catch {
    database = "disconnected";
  }

  return {
    success: true,
    status: database === "connected" ? "ok" : "degraded",
    database,
    timestamp: new Date().toISOString(),
  };
}
