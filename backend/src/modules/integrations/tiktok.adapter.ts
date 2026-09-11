import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { ConnectedAccount, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { decryptSecret, encryptSecret } from "../../lib/secrets.js";
import { AppError } from "../../middleware/errorHandler.js";
import { resolveOwnedVideoPath } from "../../lib/media.js";
import type { ConnectionInfo, FuturePublishInput, PlatformAdapter } from "../publications/platform.adapter.js";
import {
  TIKTOK_CREATOR_INFO_URL,
  TIKTOK_STATUS_URL,
  TIKTOK_VIDEO_INIT_URL,
} from "./tiktok.constants.js";
import { tiktokFetch } from "./tiktok.http.js";
import { TikTokOAuthProvider } from "./tiktok.oauth.js";

const oauth = new TikTokOAuthProvider();

type PublishableContent = {
  userId: string;
  title: string;
  body: string | null;
  tags: string | null;
  videoPath: string | null;
  kind: string;
};

type TikTokApiEnvelope = {
  data?: {
    publish_id?: string;
    upload_url?: string;
    status?: string;
    fail_reason?: string;
    publicaly_available_post_id?: Array<string | number>;
    creator_username?: string;
    creator_nickname?: string;
    privacy_level_options?: string[];
  };
  error?: { code?: string; message?: string };
};

export type TikTokPublishResult = {
  externalId: string;
  status: "PUBLISHED" | "PROCESSING";
};

function tiktokErrorCode(payload: TikTokApiEnvelope | null | undefined) {
  return payload?.error?.code && payload.error.code !== "ok" ? payload.error.code : null;
}

async function loadAccount(account: ConnectionInfo) {
  const stored = await prisma.connectedAccount.findUnique({ where: { id: account.id } });
  if (!stored || stored.platform !== "TIKTOK") {
    throw new AppError(400, "TIKTOK_NOT_CONNECTED", "TikTok is not connected.");
  }
  return stored;
}

async function persistTokens(
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

export async function getValidTikTokAccessToken(account: ConnectedAccount) {
  const accessToken = decryptSecret(account.accessToken);
  const refreshToken = decryptSecret(account.refreshToken);
  if (!accessToken && !refreshToken) {
    await prisma.connectedAccount.update({
      where: { id: account.id },
      data: { status: "DISCONNECTED" },
    });
    throw new AppError(400, "TIKTOK_NOT_CONNECTED", "TikTok is not connected.");
  }

  const expired = account.tokenExpiresAt ? account.tokenExpiresAt.getTime() <= Date.now() + 60_000 : false;
  if (accessToken && !expired) return accessToken;
  if (!refreshToken) {
    await prisma.connectedAccount.update({
      where: { id: account.id },
      data: { status: "EXPIRED" },
    });
    throw new AppError(401, "TIKTOK_TOKEN_EXPIRED", "TikTok token has expired.");
  }

  try {
    const refreshed = await oauth.refreshToken(refreshToken);
    await persistTokens(account.id, refreshed.accessToken, refreshed.refreshToken ?? refreshToken, refreshed.expiresAt);
    return refreshed.accessToken;
  } catch (error) {
    await prisma.connectedAccount.update({
      where: { id: account.id },
      data: { status: "EXPIRED" },
    });
    if (error instanceof AppError) throw error;
    throw new AppError(401, "TIKTOK_TOKEN_EXPIRED", "TikTok token has expired.");
  }
}

function captionFor(content: PublishableContent) {
  const parts = [content.title, content.body].filter(Boolean);
  return parts.join("\n").slice(0, 2200);
}

function mimeFor(path: string) {
  if (path.endsWith(".webm")) return "video/webm";
  if (path.endsWith(".mov")) return "video/quicktime";
  if (path.endsWith(".avi")) return "video/x-msvideo";
  if (path.endsWith(".mpeg")) return "video/mpeg";
  return "video/mp4";
}

function metadataRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

export class TikTokPlatformAdapter implements PlatformAdapter {
  readonly platform = "TIKTOK" as const;

  async validateConnection(account: ConnectionInfo): Promise<boolean> {
    const stored = await loadAccount(account);
    const token = await getValidTikTokAccessToken(stored);
    const response = await tiktokFetch(TIKTOK_CREATOR_INFO_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json; charset=UTF-8",
      },
      body: "{}",
    });
    const payload = (await response.json().catch(() => ({}))) as TikTokApiEnvelope;
    if (!response.ok || tiktokErrorCode(payload)) {
      await prisma.connectedAccount.update({ where: { id: stored.id }, data: { status: "ERROR" } });
      throw new AppError(502, "TIKTOK_API_ERROR", "TikTok connection could not be validated.");
    }
    await prisma.connectedAccount.update({ where: { id: stored.id }, data: { status: "CONNECTED" } });
    return true;
  }

  async getAccountInfo(account: ConnectionInfo) {
    const stored = await loadAccount(account);
    const token = await getValidTikTokAccessToken(stored);
    const info = await oauth.fetchUser(token);
    await prisma.connectedAccount.update({
      where: { id: stored.id },
      data: {
        displayName: info.displayName,
        externalAccountId: info.externalAccountId,
        status: "CONNECTED",
      },
    });
    return info;
  }

  async disconnect(account: ConnectionInfo): Promise<void> {
    const stored = await prisma.connectedAccount.findUnique({ where: { id: account.id } });
    if (!stored) return;
    const token = decryptSecret(stored.accessToken);
    if (token) await oauth.revokeToken(token);
  }

  async publish(input: FuturePublishInput): Promise<{ externalId: string; status?: "PUBLISHED" | "PROCESSING" }> {
    const publication = await prisma.publication.findUnique({
      where: { id: input.publicationId },
      include: { content: true, connectedAccount: true },
    });
    if (!publication) throw new AppError(404, "NOT_FOUND", "Publication not found.");
    if (publication.platform !== "TIKTOK") {
      throw new AppError(400, "INVALID_PLATFORM", "Publication platform is not TikTok.");
    }
    if (!["SCHEDULED", "READY", "PENDING"].includes(publication.status)) {
      throw new AppError(400, "PUBLICATION_NOT_READY", "Publication is not ready to publish.");
    }
    if (publication.content.status !== "APPROVED" && publication.content.status !== "SCHEDULED") {
      throw new AppError(400, "PUBLICATION_NOT_READY", "Content is not approved for publication.");
    }
    if (!publication.connectedAccountId || !publication.connectedAccount) {
      throw new AppError(400, "TIKTOK_NOT_CONNECTED", "TikTok is not connected.");
    }
    if (publication.connectedAccount.userId !== publication.userId) {
      throw new AppError(403, "UNAUTHORIZED_INTEGRATION", "Connected account does not belong to this user.");
    }
    if (publication.content.userId !== publication.userId) {
      throw new AppError(403, "UNAUTHORIZED_INTEGRATION", "Content does not belong to this user.");
    }
    return this.uploadVideo(publication.connectedAccount, publication.content, publication.userId, publication.id);
  }

  async fetchPublishStatus(account: ConnectedAccount, publishId: string) {
    const token = await getValidTikTokAccessToken(account);
    const response = await tiktokFetch(TIKTOK_STATUS_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: publishId }),
    });
    const payload = (await response.json().catch(() => ({}))) as TikTokApiEnvelope;
    if (!response.ok || tiktokErrorCode(payload)) {
      throw new AppError(502, "TIKTOK_API_ERROR", "Failed to fetch TikTok publish status.");
    }
    const status = payload.data?.status ?? "PROCESSING_UPLOAD";
    const postIds = payload.data?.publicaly_available_post_id ?? [];
    const confirmedId = postIds.length ? String(postIds[0]) : publishId;
    if (status === "FAILED") {
      throw new AppError(502, "TIKTOK_UPLOAD_FAILED", payload.data?.fail_reason || "TikTok video upload failed.");
    }
    if (status === "PUBLISH_COMPLETE") {
      return { status: "PUBLISHED" as const, externalId: confirmedId };
    }
    return { status: "PROCESSING" as const, externalId: publishId };
  }

  async uploadVideo(account: ConnectedAccount, content: PublishableContent, userId: string, publicationId: string) {
    if (!content.videoPath) {
      throw new AppError(400, "VIDEO_REQUIRED", "A video file is required to publish on TikTok.");
    }
    const filePath = resolveOwnedVideoPath(userId, content.videoPath);
    const fileStat = await stat(filePath).catch(() => null);
    if (!fileStat) {
      throw new AppError(400, "VIDEO_REQUIRED", "A video file is required to publish on TikTok.");
    }

    const token = await getValidTikTokAccessToken(account);
    const creator = await tiktokFetch(TIKTOK_CREATOR_INFO_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json; charset=UTF-8",
      },
      body: "{}",
    });
    const creatorPayload = (await creator.json().catch(() => ({}))) as TikTokApiEnvelope;
    if (!creator.ok || tiktokErrorCode(creatorPayload)) {
      throw new AppError(502, "TIKTOK_API_ERROR", "Failed to load TikTok creator information.");
    }
    const privacyOptions = creatorPayload.data?.privacy_level_options ?? [];
    const privacyLevel = privacyOptions.includes("SELF_ONLY")
      ? "SELF_ONLY"
      : privacyOptions[0] ?? "SELF_ONLY";

    const init = await tiktokFetch(TIKTOK_VIDEO_INIT_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: captionFor(content),
          privacy_level: privacyLevel,
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: fileStat.size,
          chunk_size: fileStat.size,
          total_chunk_count: 1,
        },
      }),
    });
    const initPayload = (await init.json().catch(() => ({}))) as TikTokApiEnvelope;
    if (!init.ok || tiktokErrorCode(initPayload) || !initPayload.data?.publish_id || !initPayload.data.upload_url) {
      throw new AppError(502, "TIKTOK_UPLOAD_FAILED", "TikTok rejected the upload session.");
    }

    const body = createReadStream(filePath);
    const uploaded = await tiktokFetch(initPayload.data.upload_url, {
      method: "PUT",
      headers: {
        "content-type": mimeFor(filePath),
        "content-length": String(fileStat.size),
        "content-range": `bytes 0-${fileStat.size - 1}/${fileStat.size}`,
      },
      body: body as unknown as BodyInit,
      duplex: "half",
    } as RequestInit);
    if (!uploaded.ok) {
      throw new AppError(502, "TIKTOK_UPLOAD_FAILED", "TikTok video upload failed.");
    }

    const publishId = initPayload.data.publish_id;
    const metadata = metadataRecord(account.metadata);
    metadata.lastPublishId = publishId;
    metadata.lastPublicationId = publicationId;
    await prisma.connectedAccount.update({
      where: { id: account.id },
      data: { metadata: metadata as Prisma.InputJsonValue },
    });

    const status = await this.fetchPublishStatus(account, publishId);
    if (status.status === "PUBLISHED") {
      return { externalId: status.externalId, status: "PUBLISHED" as const };
    }
    return { externalId: publishId, status: "PROCESSING" as const };
  }
}
