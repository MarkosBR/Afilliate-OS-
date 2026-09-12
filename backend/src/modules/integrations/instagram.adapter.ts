import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { ConnectedAccount, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { resolveOwnedVideoPath } from "../../lib/media.js";
import type { ConnectionInfo, FuturePublishInput, PlatformAdapter } from "../publications/platform.adapter.js";
import { META_GRAPH_BASE, META_RUPLOAD_BASE } from "./meta.constants.js";
import { metaFetch } from "./meta.http.js";
import {
  captionFor,
  getValidMetaPageToken,
  metadataRecord,
  revokeMetaToken,
  throwMetaGraphError,
} from "./meta.tokens.js";

async function loadAccount(account: ConnectionInfo) {
  const stored = await prisma.connectedAccount.findUnique({ where: { id: account.id } });
  if (!stored || stored.platform !== "INSTAGRAM") {
    throw new AppError(400, "META_NOT_CONNECTED", "Instagram is not connected.");
  }
  return stored;
}

function igUserIdFor(account: ConnectedAccount) {
  return metadataRecord(account.metadata).igUserId || account.externalAccountId;
}

function assertProfessionalAccount(account: ConnectedAccount) {
  const igUserId = igUserIdFor(account);
  if (!igUserId) {
    throw new AppError(
      400,
      "INSTAGRAM_ACCOUNT_NOT_SUPPORTED",
      "Instagram professional account linked to a Facebook Page is required.",
    );
  }
  return igUserId;
}

export class InstagramPlatformAdapter implements PlatformAdapter {
  readonly platform = "INSTAGRAM" as const;

  async validateConnection(account: ConnectionInfo): Promise<boolean> {
    const stored = await loadAccount(account);
    const igUserId = assertProfessionalAccount(stored);
    const token = await getValidMetaPageToken(stored);
    const response = await metaFetch(
      `${META_GRAPH_BASE}/${igUserId}?fields=id,username&access_token=${encodeURIComponent(token)}`,
    );
    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
      error?: { message?: string; code?: number; type?: string };
    };
    if (!response.ok || payload.error) {
      await prisma.connectedAccount.update({ where: { id: stored.id }, data: { status: "ERROR" } });
      throwMetaGraphError(payload, "META_API_ERROR", "Instagram connection could not be validated.");
    }
    await prisma.connectedAccount.update({ where: { id: stored.id }, data: { status: "CONNECTED" } });
    return true;
  }

  async getAccountInfo(account: ConnectionInfo) {
    const stored = await loadAccount(account);
    const igUserId = assertProfessionalAccount(stored);
    const token = await getValidMetaPageToken(stored);
    const response = await metaFetch(
      `${META_GRAPH_BASE}/${igUserId}?fields=id,username,name&access_token=${encodeURIComponent(token)}`,
    );
    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
      username?: string;
      name?: string;
      error?: { message?: string; code?: number };
    };
    if (!response.ok || payload.error) {
      throwMetaGraphError(payload, "META_API_ERROR", "Failed to load Instagram account information.");
    }
    const info = {
      externalAccountId: payload.id ?? igUserId,
      displayName: payload.name || payload.username || stored.displayName,
    };
    await prisma.connectedAccount.update({
      where: { id: stored.id },
      data: { displayName: info.displayName, externalAccountId: info.externalAccountId, status: "CONNECTED" },
    });
    return info;
  }

  async disconnect(account: ConnectionInfo): Promise<void> {
    const stored = await prisma.connectedAccount.findUnique({ where: { id: account.id } });
    if (!stored) return;
    await revokeMetaToken(stored);
  }

  async publish(input: FuturePublishInput): Promise<{ externalId: string; status?: "PUBLISHED" | "PROCESSING" }> {
    const publication = await prisma.publication.findUnique({
      where: { id: input.publicationId },
      include: { content: true, connectedAccount: true },
    });
    if (!publication) throw new AppError(404, "NOT_FOUND", "Publication not found.");
    if (publication.platform !== "INSTAGRAM") {
      throw new AppError(400, "INVALID_PLATFORM", "Publication platform is not Instagram.");
    }
    if (!["SCHEDULED", "READY", "PENDING"].includes(publication.status)) {
      throw new AppError(400, "PUBLICATION_NOT_READY", "Publication is not ready to publish.");
    }
    if (publication.content.status !== "APPROVED" && publication.content.status !== "SCHEDULED") {
      throw new AppError(400, "PUBLICATION_NOT_READY", "Content is not approved for publication.");
    }
    if (!publication.connectedAccountId || !publication.connectedAccount) {
      throw new AppError(400, "META_NOT_CONNECTED", "Instagram is not connected.");
    }
    if (publication.connectedAccount.userId !== publication.userId) {
      throw new AppError(403, "UNAUTHORIZED_INTEGRATION", "Connected account does not belong to this user.");
    }
    if (publication.content.userId !== publication.userId) {
      throw new AppError(403, "UNAUTHORIZED_INTEGRATION", "Content does not belong to this user.");
    }
    return this.publishMedia(publication.connectedAccount, publication.content, publication.userId, publication.id);
  }

  async fetchPublishStatus(
    account: ConnectedAccount,
    containerId: string,
  ): Promise<{ status: "PUBLISHED" | "PROCESSING"; externalId: string }> {
    const igUserId = assertProfessionalAccount(account);
    const token = await getValidMetaPageToken(account);
    const statusResponse = await metaFetch(
      `${META_GRAPH_BASE}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`,
    );
    const statusPayload = (await statusResponse.json().catch(() => ({}))) as {
      status_code?: string;
      error?: { message?: string; code?: number; type?: string };
    };
    if (!statusResponse.ok || statusPayload.error) {
      throwMetaGraphError(statusPayload, "META_API_ERROR", "Failed to fetch Instagram media status.");
    }
    const status = statusPayload.status_code ?? "IN_PROGRESS";
    if (status === "ERROR" || status === "EXPIRED") {
      throw new AppError(502, "INSTAGRAM_PUBLISH_FAILED", "Instagram rejected the media container.");
    }
    if (status !== "FINISHED" && status !== "PUBLISHED") {
      return { status: "PROCESSING" as const, externalId: containerId };
    }
    if (status === "PUBLISHED") {
      return { status: "PUBLISHED" as const, externalId: containerId };
    }
    const published = await metaFetch(
      `${META_GRAPH_BASE}/${igUserId}/media_publish?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ creation_id: containerId }),
      },
    );
    const payload = (await published.json().catch(() => ({}))) as {
      id?: string;
      error?: { message?: string; code?: number; type?: string };
    };
    const externalId = payload.id;
    if (!published.ok || payload.error || !externalId) {
      throwMetaGraphError(payload, "INSTAGRAM_PUBLISH_FAILED", "Instagram rejected the publication.");
    }
    return { status: "PUBLISHED" as const, externalId };
  }

  async publishMedia(
    account: ConnectedAccount,
    content: { userId: string; title: string; body: string | null; videoPath: string | null },
    userId: string,
    publicationId: string,
  ) {
    const igUserId = assertProfessionalAccount(account);
    if (!content.videoPath) {
      throw new AppError(400, "MEDIA_NOT_SUPPORTED", "Instagram publishing requires a local video file.");
    }
    const filePath = resolveOwnedVideoPath(userId, content.videoPath);
    const fileStat = await stat(filePath).catch(() => null);
    if (!fileStat) {
      throw new AppError(400, "MEDIA_NOT_SUPPORTED", "Instagram publishing requires a local video file.");
    }

    const token = await getValidMetaPageToken(account);
    const init = await metaFetch(
      `${META_GRAPH_BASE}/${igUserId}/media?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          media_type: "REELS",
          upload_type: "resumable",
          caption: captionFor(content, 2200),
        }),
      },
    );
    const initPayload = (await init.json().catch(() => ({}))) as {
      id?: string;
      uri?: string;
      error?: { message?: string; code?: number; type?: string };
    };
    const containerId = initPayload.id;
    if (!init.ok || initPayload.error || !containerId) {
      throwMetaGraphError(initPayload, "INSTAGRAM_PUBLISH_FAILED", "Instagram rejected the media container.");
    }

    const uploadUrl = initPayload.uri || `${META_RUPLOAD_BASE}/${containerId}`;
    const body = createReadStream(filePath);
    const uploaded = await metaFetch(uploadUrl, {
      method: "POST",
      headers: {
        authorization: `OAuth ${token}`,
        offset: "0",
        file_size: String(fileStat.size),
        "content-type": "application/octet-stream",
      },
      body: body as unknown as BodyInit,
      duplex: "half",
    } as RequestInit);
    if (!uploaded.ok) {
      throw new AppError(502, "INSTAGRAM_PUBLISH_FAILED", "Instagram video upload failed.");
    }

    const metadata = metadataRecord(account.metadata);
    metadata.lastContainerId = containerId;
    metadata.lastPublicationId = publicationId;
    await prisma.connectedAccount.update({
      where: { id: account.id },
      data: { metadata: metadata as Prisma.InputJsonValue },
    });

    const status = await this.fetchPublishStatus(account, containerId);
    if (status.status === "PUBLISHED") {
      return { externalId: status.externalId, status: "PUBLISHED" as const };
    }
    return { externalId: containerId, status: "PROCESSING" as const };
  }
}
