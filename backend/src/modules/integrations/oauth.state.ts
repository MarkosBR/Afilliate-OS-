import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/errorHandler.js";
import type { IntegrationPlatform } from "@prisma/client";

const TTL_MS = 10 * 60 * 1000;

function signState(raw: string) {
  return createHmac("sha256", env.AUTH_SECRET).update(raw).digest("base64url");
}

export async function createOAuthState(userId: string, platform: IntegrationPlatform) {
  const nonce = randomBytes(24).toString("base64url");
  const raw = `${userId}.${platform}.${nonce}.${Date.now()}`;
  const state = `${raw}.${signState(raw)}`;
  await prisma.oAuthState.create({
    data: {
      userId,
      platform,
      state,
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });
  return state;
}

export async function consumeOAuthState(state: string, platform: IntegrationPlatform) {
  if (!state || !state.includes(".")) {
    throw new AppError(400, "OAUTH_STATE_INVALID", "Invalid OAuth state.");
  }
  const lastDot = state.lastIndexOf(".");
  const raw = state.slice(0, lastDot);
  const signature = state.slice(lastDot + 1);
  const expected = signState(raw);
  const provided = Buffer.from(signature);
  const valid = Buffer.from(expected);
  if (provided.length !== valid.length || !timingSafeEqual(provided, valid)) {
    throw new AppError(400, "OAUTH_STATE_INVALID", "Invalid OAuth state.");
  }

  const record = await prisma.oAuthState.findUnique({ where: { state } });
  if (!record || record.platform !== platform || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw new AppError(400, "OAUTH_STATE_INVALID", "Invalid OAuth state.");
  }

  await prisma.oAuthState.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  return record.userId;
}
