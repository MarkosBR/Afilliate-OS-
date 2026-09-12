import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { encryptSecret } from "../../lib/secrets.js";
import { serializeConnectedAccount } from "../../lib/serializers.js";
import { AppError } from "../../middleware/errorHandler.js";
import { createOAuthState, consumeOAuthState } from "./oauth.state.js";
import { META_SCOPES } from "./meta.constants.js";
import { MetaOAuthProvider, assertMetaOAuthConfigured } from "./meta.oauth.js";

const provider = new MetaOAuthProvider();

export async function startMetaConnect(userId: string) {
  assertMetaOAuthConfigured();
  const state = await createOAuthState(userId, "FACEBOOK");
  const authorizationUrl = provider.getAuthorizationUrl(state);
  await prisma.connectedAccount.upsert({
    where: { userId_platform: { userId, platform: "FACEBOOK" } },
    create: { userId, platform: "FACEBOOK", status: "CONNECTING" },
    update: { status: "CONNECTING" },
  });
  await prisma.connectedAccount.upsert({
    where: { userId_platform: { userId, platform: "INSTAGRAM" } },
    create: { userId, platform: "INSTAGRAM", status: "CONNECTING" },
    update: { status: "CONNECTING" },
  });
  return { authorizationUrl };
}

export async function completeMetaCallback(input: { code?: string; state?: string; error?: string | null }) {
  if (input.error || !input.code || !input.state) {
    throw new AppError(400, "OAUTH_CALLBACK_FAILED", "Meta OAuth callback failed.");
  }
  const userId = await consumeOAuthState(input.state, "FACEBOOK");
  let tokens;
  try {
    tokens = await provider.exchangeCode(input.code);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(502, "META_OAUTH_ERROR", "Meta OAuth callback failed.");
  }

  const page = tokens.pages[0];
  if (!page) {
    await prisma.connectedAccount.upsert({
      where: { userId_platform: { userId, platform: "FACEBOOK" } },
      create: { userId, platform: "FACEBOOK", status: "ERROR" },
      update: { status: "ERROR", accessToken: null, refreshToken: null },
    });
    await prisma.connectedAccount.upsert({
      where: { userId_platform: { userId, platform: "INSTAGRAM" } },
      create: { userId, platform: "INSTAGRAM", status: "DISCONNECTED" },
      update: { status: "DISCONNECTED", accessToken: null, refreshToken: null },
    });
    throw new AppError(400, "META_NOT_CONNECTED", "No Facebook Page is available for this Meta account.");
  }

  const facebookMetadata = {
    pageId: page.pageId,
    metaUserId: tokens.userId ?? null,
    igUserId: page.igUserId,
  };
  const facebook = await prisma.connectedAccount.upsert({
    where: { userId_platform: { userId, platform: "FACEBOOK" } },
    create: {
      userId,
      platform: "FACEBOOK",
      status: "CONNECTED",
      externalAccountId: page.pageId,
      displayName: page.pageName,
      scopes: [...META_SCOPES],
      accessToken: encryptSecret(page.pageAccessToken),
      refreshToken: encryptSecret(tokens.refreshToken ?? tokens.accessToken),
      tokenExpiresAt: tokens.expiresAt ?? null,
      metadata: facebookMetadata as Prisma.InputJsonValue,
    },
    update: {
      status: "CONNECTED",
      externalAccountId: page.pageId,
      displayName: page.pageName,
      scopes: [...META_SCOPES],
      accessToken: encryptSecret(page.pageAccessToken),
      refreshToken: encryptSecret(tokens.refreshToken ?? tokens.accessToken),
      tokenExpiresAt: tokens.expiresAt ?? null,
      metadata: facebookMetadata as Prisma.InputJsonValue,
    },
  });

  if (page.igUserId) {
    const instagramMetadata = {
      pageId: page.pageId,
      igUserId: page.igUserId,
      igUsername: page.igUsername,
    };
    await prisma.connectedAccount.upsert({
      where: { userId_platform: { userId, platform: "INSTAGRAM" } },
      create: {
        userId,
        platform: "INSTAGRAM",
        status: "CONNECTED",
        externalAccountId: page.igUserId,
        displayName: page.igName || page.igUsername || page.pageName,
        scopes: [...META_SCOPES],
        accessToken: encryptSecret(page.pageAccessToken),
        refreshToken: encryptSecret(tokens.refreshToken ?? tokens.accessToken),
        tokenExpiresAt: tokens.expiresAt ?? null,
        metadata: instagramMetadata as Prisma.InputJsonValue,
      },
      update: {
        status: "CONNECTED",
        externalAccountId: page.igUserId,
        displayName: page.igName || page.igUsername || page.pageName,
        scopes: [...META_SCOPES],
        accessToken: encryptSecret(page.pageAccessToken),
        refreshToken: encryptSecret(tokens.refreshToken ?? tokens.accessToken),
        tokenExpiresAt: tokens.expiresAt ?? null,
        metadata: instagramMetadata as Prisma.InputJsonValue,
      },
    });
  } else {
    await prisma.connectedAccount.upsert({
      where: { userId_platform: { userId, platform: "INSTAGRAM" } },
      create: {
        userId,
        platform: "INSTAGRAM",
        status: "DISCONNECTED",
        metadata: { reason: "INSTAGRAM_ACCOUNT_NOT_SUPPORTED", pageId: page.pageId } as Prisma.InputJsonValue,
      },
      update: {
        status: "DISCONNECTED",
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        externalAccountId: null,
        displayName: null,
        scopes: [],
        metadata: { reason: "INSTAGRAM_ACCOUNT_NOT_SUPPORTED", pageId: page.pageId } as Prisma.InputJsonValue,
      },
    });
  }

  return { userId, account: serializeConnectedAccount(facebook) };
}

export function integrationsFrontendRedirect(errorCode?: string) {
  const url = new URL("/integrations", env.FRONTEND_URL);
  if (errorCode) url.searchParams.set("error", errorCode);
  return url.toString();
}
