import { Prisma, type IntegrationPlatform } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { encryptSecret } from "../../lib/secrets.js";
import { serializeConnectedAccount } from "../../lib/serializers.js";
import { AppError } from "../../middleware/errorHandler.js";
import { getOAuthProvider } from "./oauth.provider.js";
import { getPlatformAdapter } from "../publications/platform.adapter.js";

export async function listIntegrations(userId: string) {
  const items = await prisma.connectedAccount.findMany({
    where: { userId },
    orderBy: { platform: "asc" },
  });
  return items.map(serializeConnectedAccount);
}

export async function getIntegration(userId: string, id: string) {
  const item = await prisma.connectedAccount.findFirst({ where: { id, userId } });
  if (!item) throw new AppError(404, "INTEGRATION_NOT_FOUND", "Integration not found.");
  return serializeConnectedAccount(item);
}

export async function getIntegrationStatus(userId: string, id: string) {
  const item = await getIntegration(userId, id);
  return {
    id: item.id,
    platform: item.platform,
    status: item.status,
    displayName: item.displayName,
    tokenExpiresAt: item.tokenExpiresAt,
  };
}

export async function connectPlatform(userId: string, platform: IntegrationPlatform) {
  getPlatformAdapter(platform);
  const provider = getOAuthProvider(platform);
  try {
    provider.getAuthorizationUrl(`${userId}:${platform}`);
  } catch (error) {
    await prisma.connectedAccount.upsert({
      where: { userId_platform: { userId, platform } },
      create: {
        userId,
        platform,
        status: "DISCONNECTED",
        accessToken: null,
        refreshToken: null,
      },
      update: {
        status: "DISCONNECTED",
        accessToken: null,
        refreshToken: null,
      },
    });
    throw error;
  }
  throw new AppError(501, "OAUTH_NOT_CONFIGURED", "OAuth is not configured for this platform.");
}

export async function disconnectIntegration(userId: string, id: string) {
  const existing = await prisma.connectedAccount.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "CONNECTION_NOT_FOUND", "Connection not found.");

  const adapter = getPlatformAdapter(existing.platform);
  await adapter.disconnect({
    id: existing.id,
    platform: existing.platform,
    status: existing.status,
    displayName: existing.displayName,
    externalAccountId: existing.externalAccountId,
  });

  const item = await prisma.connectedAccount.update({
    where: { id },
    data: {
      status: "DISCONNECTED",
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      externalAccountId: null,
      displayName: null,
      scopes: [],
      metadata: Prisma.JsonNull,
    },
  });
  return serializeConnectedAccount(item);
}

export async function assertOwnedConnectedAccount(
  userId: string,
  connectedAccountId: string,
  platform?: IntegrationPlatform | "OTHER",
) {
  const account = await prisma.connectedAccount.findFirst({
    where: { id: connectedAccountId, userId },
  });
  if (!account) throw new AppError(403, "UNAUTHORIZED_INTEGRATION", "Integration does not belong to this user.");
  if (platform && platform !== "OTHER" && account.platform !== platform) {
    throw new AppError(400, "INVALID_PLATFORM", "Connected account platform does not match publication.");
  }
  if (account.status === "EXPIRED") {
    throw new AppError(400, "CONNECTION_EXPIRED", "Connected account token has expired.");
  }
  return account;
}

export function storeEncryptedTokens(accessToken?: string | null, refreshToken?: string | null) {
  return {
    accessToken: encryptSecret(accessToken),
    refreshToken: encryptSecret(refreshToken),
  };
}
