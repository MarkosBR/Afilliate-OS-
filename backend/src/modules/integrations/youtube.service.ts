import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { encryptSecret } from "../../lib/secrets.js";
import { serializeConnectedAccount } from "../../lib/serializers.js";
import { AppError } from "../../middleware/errorHandler.js";
import { createOAuthState, consumeOAuthState } from "./oauth.state.js";
import { YouTubeOAuthProvider, assertYouTubeOAuthConfigured } from "./youtube.oauth.js";
import { YOUTUBE_SCOPES } from "./youtube.constants.js";

const provider = new YouTubeOAuthProvider();

export async function startYouTubeConnect(userId: string) {
  assertYouTubeOAuthConfigured();
  const state = await createOAuthState(userId, "YOUTUBE");
  const authorizationUrl = provider.getAuthorizationUrl(state);
  await prisma.connectedAccount.upsert({
    where: { userId_platform: { userId, platform: "YOUTUBE" } },
    create: {
      userId,
      platform: "YOUTUBE",
      status: "CONNECTING",
    },
    update: {
      status: "CONNECTING",
    },
  });
  return { authorizationUrl };
}

export async function completeYouTubeCallback(input: { code?: string; state?: string; error?: string | null }) {
  if (input.error || !input.code || !input.state) {
    throw new AppError(400, "OAUTH_CALLBACK_FAILED", "YouTube OAuth callback failed.");
  }
  const userId = await consumeOAuthState(input.state, "YOUTUBE");
  let tokens;
  try {
    tokens = await provider.exchangeCode(input.code);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(502, "OAUTH_CALLBACK_FAILED", "YouTube OAuth callback failed.");
  }

  const item = await prisma.connectedAccount.upsert({
    where: { userId_platform: { userId, platform: "YOUTUBE" } },
    create: {
      userId,
      platform: "YOUTUBE",
      status: "CONNECTED",
      externalAccountId: tokens.externalAccountId ?? null,
      displayName: tokens.displayName ?? null,
      scopes: tokens.scopes?.length ? tokens.scopes : [...YOUTUBE_SCOPES],
      accessToken: encryptSecret(tokens.accessToken),
      refreshToken: encryptSecret(tokens.refreshToken),
      tokenExpiresAt: tokens.expiresAt ?? null,
    },
    update: {
      status: "CONNECTED",
      externalAccountId: tokens.externalAccountId ?? undefined,
      displayName: tokens.displayName ?? undefined,
      scopes: tokens.scopes?.length ? tokens.scopes : [...YOUTUBE_SCOPES],
      accessToken: encryptSecret(tokens.accessToken),
      refreshToken: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : undefined,
      tokenExpiresAt: tokens.expiresAt ?? null,
      metadata: Prisma.JsonNull,
    },
  });
  return { userId, account: serializeConnectedAccount(item) };
}

export function integrationsFrontendRedirect(errorCode?: string) {
  const url = new URL("/integrations", env.FRONTEND_URL);
  if (errorCode) url.searchParams.set("error", errorCode);
  return url.toString();
}
