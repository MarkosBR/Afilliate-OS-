import type { ConnectedAccount, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { decryptSecret, encryptSecret } from "../../lib/secrets.js";
import { AppError } from "../../middleware/errorHandler.js";
import { META_GRAPH_BASE } from "./meta.constants.js";
import { metaFetch } from "./meta.http.js";
import { MetaOAuthProvider } from "./meta.oauth.js";

const oauth = new MetaOAuthProvider();

export type MetaAccountMetadata = {
  pageId?: string | null;
  igUserId?: string | null;
  igUsername?: string | null;
  metaUserId?: string | null;
  lastContainerId?: string | null;
  lastPublicationId?: string | null;
};

export function metadataRecord(value: Prisma.JsonValue | null | undefined): MetaAccountMetadata {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as MetaAccountMetadata) };
  }
  return {};
}

export function captionFor(content: { title: string; body: string | null }, max = 2200) {
  return [content.title, content.body].filter(Boolean).join("\n").slice(0, max);
}

export function mimeFor(path: string) {
  if (path.endsWith(".webm")) return "video/webm";
  if (path.endsWith(".mov")) return "video/quicktime";
  if (path.endsWith(".avi")) return "video/x-msvideo";
  if (path.endsWith(".mpeg")) return "video/mpeg";
  return "video/mp4";
}

export function throwMetaGraphError(
  payload: { error?: { message?: string; code?: number; type?: string } } | null | undefined,
  fallbackCode: string,
  fallbackMessage: string,
): never {
  const code = payload?.error?.code;
  if (code === 190) {
    throw new AppError(401, "META_TOKEN_EXPIRED", "Meta token has expired.");
  }
  if (code === 10 || code === 200 || payload?.error?.type === "OAuthException") {
    throw new AppError(403, "PERMISSION_DENIED", payload?.error?.message || "Meta permission was denied.");
  }
  throw new AppError(502, fallbackCode, payload?.error?.message || fallbackMessage);
}

export async function persistMetaTokens(
  accountId: string,
  accessToken: string,
  refreshToken: string | null | undefined,
  expiresAt: Date | null | undefined,
) {
  await prisma.connectedAccount.update({
    where: { id: accountId },
    data: {
      accessToken: encryptSecret(accessToken),
      refreshToken: refreshToken === undefined ? undefined : encryptSecret(refreshToken),
      tokenExpiresAt: expiresAt ?? undefined,
      status: "CONNECTED",
    },
  });
}

export async function getValidMetaPageToken(account: ConnectedAccount) {
  const accessToken = decryptSecret(account.accessToken);
  const userToken = decryptSecret(account.refreshToken);
  if (!accessToken && !userToken) {
    await prisma.connectedAccount.update({
      where: { id: account.id },
      data: { status: "DISCONNECTED" },
    });
    throw new AppError(400, "META_NOT_CONNECTED", "Meta is not connected.");
  }

  const expired = account.tokenExpiresAt ? account.tokenExpiresAt.getTime() <= Date.now() + 60_000 : false;
  if (accessToken && !expired) return accessToken;
  if (!userToken) {
    await prisma.connectedAccount.update({
      where: { id: account.id },
      data: { status: "EXPIRED" },
    });
    throw new AppError(401, "META_TOKEN_EXPIRED", "Meta token has expired.");
  }

  try {
    const refreshed = await oauth.refreshToken(userToken);
    const pages = await oauth.fetchPages(refreshed.accessToken);
    const meta = metadataRecord(account.metadata);
    const page =
      pages.find((item) => item.pageId === (meta.pageId || account.externalAccountId)) ??
      pages.find((item) => item.igUserId === (meta.igUserId || account.externalAccountId)) ??
      pages[0];
    if (!page) {
      throw new AppError(400, "META_NOT_CONNECTED", "No Facebook Page is available for this Meta account.");
    }
    await persistMetaTokens(account.id, page.pageAccessToken, refreshed.accessToken, refreshed.expiresAt);
    return page.pageAccessToken;
  } catch (error) {
    await prisma.connectedAccount.update({
      where: { id: account.id },
      data: { status: "EXPIRED" },
    });
    if (error instanceof AppError) throw error;
    throw new AppError(401, "META_TOKEN_EXPIRED", "Meta token has expired.");
  }
}

export async function metaGraph(path: string, token: string, init: RequestInit = {}) {
  const url = path.startsWith("http") ? path : `${META_GRAPH_BASE}${path}`;
  const separator = url.includes("?") ? "&" : "?";
  const response = await metaFetch(`${url}${separator}access_token=${encodeURIComponent(token)}`, init);
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown> & {
    error?: { message?: string; code?: number; type?: string };
  };
  return { response, payload };
}

export async function revokeMetaToken(account: ConnectedAccount) {
  const token = decryptSecret(account.refreshToken) || decryptSecret(account.accessToken);
  if (token) await oauth.revokeToken(token);
}
