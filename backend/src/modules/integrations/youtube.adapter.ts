import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { ConnectedAccount } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { decryptSecret, encryptSecret } from "../../lib/secrets.js";
import { AppError } from "../../middleware/errorHandler.js";
import { resolveOwnedVideoPath } from "../../lib/media.js";
import type { ConnectionInfo, FuturePublishInput, PlatformAdapter } from "../publications/platform.adapter.js";
import { YOUTUBE_CHANNELS_URL, YOUTUBE_UPLOAD_URL } from "./youtube.constants.js";
import { youtubeFetch } from "./youtube.http.js";
import { YouTubeOAuthProvider } from "./youtube.oauth.js";

const oauth = new YouTubeOAuthProvider();

type PublishableContent = {
  userId: string;
  title: string;
  body: string | null;
  tags: string | null;
  videoPath: string | null;
  kind: string;
};

async function loadAccount(account: ConnectionInfo) {
  const stored = await prisma.connectedAccount.findUnique({ where: { id: account.id } });
  if (!stored || stored.platform !== "YOUTUBE") {
    throw new AppError(400, "YOUTUBE_NOT_CONNECTED", "YouTube is not connected.");
  }
  return stored;
}

async function persistTokens(accountId: string, accessToken: string, refreshToken: string | null | undefined, expiresAt: Date | null | undefined) {
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

export async function getValidYouTubeAccessToken(account: ConnectedAccount) {
  const accessToken = decryptSecret(account.accessToken);
  const refreshToken = decryptSecret(account.refreshToken);
  if (!accessToken && !refreshToken) {
    await prisma.connectedAccount.update({
      where: { id: account.id },
      data: { status: "DISCONNECTED" },
    });
    throw new AppError(400, "YOUTUBE_NOT_CONNECTED", "YouTube is not connected.");
  }

  const expired = account.tokenExpiresAt ? account.tokenExpiresAt.getTime() <= Date.now() + 60_000 : false;
  if (accessToken && !expired) return accessToken;
  if (!refreshToken) {
    await prisma.connectedAccount.update({
      where: { id: account.id },
      data: { status: "EXPIRED" },
    });
    throw new AppError(401, "YOUTUBE_TOKEN_EXPIRED", "YouTube token has expired.");
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
    throw new AppError(401, "YOUTUBE_TOKEN_EXPIRED", "YouTube token has expired.");
  }
}

function parseTags(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function mimeFor(path: string) {
  if (path.endsWith(".webm")) return "video/webm";
  if (path.endsWith(".mov")) return "video/quicktime";
  if (path.endsWith(".avi")) return "video/x-msvideo";
  if (path.endsWith(".mpeg")) return "video/mpeg";
  return "video/mp4";
}

export class YouTubePlatformAdapter implements PlatformAdapter {
  readonly platform = "YOUTUBE" as const;

  async validateConnection(account: ConnectionInfo): Promise<boolean> {
    const stored = await loadAccount(account);
    const token = await getValidYouTubeAccessToken(stored);
    const response = await youtubeFetch(`${YOUTUBE_CHANNELS_URL}?part=id&mine=true`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      await prisma.connectedAccount.update({ where: { id: stored.id }, data: { status: "ERROR" } });
      throw new AppError(502, "YOUTUBE_API_ERROR", "YouTube connection could not be validated.");
    }
    await prisma.connectedAccount.update({ where: { id: stored.id }, data: { status: "CONNECTED" } });
    return true;
  }

  async getAccountInfo(account: ConnectionInfo) {
    const stored = await loadAccount(account);
    const token = await getValidYouTubeAccessToken(stored);
    const info = await oauth.fetchChannel(token);
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

  async publish(input: FuturePublishInput): Promise<{ externalId: string }> {
    const publication = await prisma.publication.findUnique({
      where: { id: input.publicationId },
      include: { content: true, connectedAccount: true },
    });
    if (!publication) throw new AppError(404, "NOT_FOUND", "Publication not found.");
    if (publication.platform !== "YOUTUBE") {
      throw new AppError(400, "INVALID_PLATFORM", "Publication platform is not YouTube.");
    }
    if (!["SCHEDULED", "READY", "PENDING"].includes(publication.status)) {
      throw new AppError(400, "PUBLICATION_NOT_READY", "Publication is not ready to publish.");
    }
    if (publication.content.status !== "APPROVED" && publication.content.status !== "SCHEDULED") {
      throw new AppError(400, "PUBLICATION_NOT_READY", "Content is not approved for publication.");
    }
    if (!publication.connectedAccountId || !publication.connectedAccount) {
      throw new AppError(400, "YOUTUBE_NOT_CONNECTED", "YouTube is not connected.");
    }
    if (publication.connectedAccount.userId !== publication.userId) {
      throw new AppError(403, "UNAUTHORIZED_INTEGRATION", "Connected account does not belong to this user.");
    }
    if (publication.content.userId !== publication.userId) {
      throw new AppError(403, "UNAUTHORIZED_INTEGRATION", "Content does not belong to this user.");
    }
    return this.uploadVideo(publication.connectedAccount, publication.content, publication.userId);
  }

  async uploadVideo(account: ConnectedAccount, content: PublishableContent, userId: string) {
    if (!content.videoPath) {
      throw new AppError(400, "VIDEO_REQUIRED", "A video file is required to publish on YouTube.");
    }
    const filePath = resolveOwnedVideoPath(userId, content.videoPath);
    const fileStat = await stat(filePath).catch(() => null);
    if (!fileStat) {
      throw new AppError(400, "VIDEO_REQUIRED", "A video file is required to publish on YouTube.");
    }

    const token = await getValidYouTubeAccessToken(account);
    const metadata = {
      snippet: {
        title: content.title.slice(0, 100),
        description: content.body ?? "",
        tags: parseTags(content.tags),
        categoryId: "22",
      },
      status: {
        privacyStatus: "private",
        selfDeclaredMadeForKids: false,
      },
    };

    const init = await youtubeFetch(`${YOUTUBE_UPLOAD_URL}?uploadType=resumable&part=snippet,status`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json; charset=UTF-8",
        "x-upload-content-length": String(fileStat.size),
        "x-upload-content-type": mimeFor(filePath),
      },
      body: JSON.stringify(metadata),
    });
    if (!init.ok) {
      throw new AppError(502, "YOUTUBE_UPLOAD_FAILED", "YouTube rejected the upload session.");
    }
    const uploadUrl = init.headers.get("location");
    if (!uploadUrl) {
      throw new AppError(502, "YOUTUBE_UPLOAD_FAILED", "YouTube did not return an upload URL.");
    }

    const body = createReadStream(filePath);
    const uploaded = await youtubeFetch(uploadUrl, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": mimeFor(filePath),
        "content-length": String(fileStat.size),
      },
      body: body as unknown as BodyInit,
      duplex: "half",
    } as RequestInit);
    const payload = (await uploaded.json().catch(() => ({}))) as { id?: string };
    if (!uploaded.ok || !payload.id) {
      throw new AppError(502, "YOUTUBE_UPLOAD_FAILED", "YouTube video upload failed.");
    }
    return { externalId: payload.id };
  }
}
