import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import type { ConnectedAccount } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { resolveOwnedVideoPath } from "../../lib/media.js";
import type { ConnectionInfo, FuturePublishInput, PlatformAdapter } from "../publications/platform.adapter.js";
import { META_GRAPH_BASE } from "./meta.constants.js";
import { metaFetch } from "./meta.http.js";
import {
  captionFor,
  getValidMetaPageToken,
  metadataRecord,
  mimeFor,
  revokeMetaToken,
  throwMetaGraphError,
} from "./meta.tokens.js";

async function loadAccount(account: ConnectionInfo) {
  const stored = await prisma.connectedAccount.findUnique({ where: { id: account.id } });
  if (!stored || stored.platform !== "FACEBOOK") {
    throw new AppError(400, "META_NOT_CONNECTED", "Facebook is not connected.");
  }
  return stored;
}

function pageIdFor(account: ConnectedAccount) {
  return metadataRecord(account.metadata).pageId || account.externalAccountId;
}

export class FacebookPlatformAdapter implements PlatformAdapter {
  readonly platform = "FACEBOOK" as const;

  async validateConnection(account: ConnectionInfo): Promise<boolean> {
    const stored = await loadAccount(account);
    const token = await getValidMetaPageToken(stored);
    const pageId = pageIdFor(stored);
    if (!pageId) {
      throw new AppError(400, "META_NOT_CONNECTED", "Facebook Page is not connected.");
    }
    const response = await metaFetch(
      `${META_GRAPH_BASE}/${pageId}?fields=id,name&access_token=${encodeURIComponent(token)}`,
    );
    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
      error?: { message?: string; code?: number; type?: string };
    };
    if (!response.ok || payload.error) {
      await prisma.connectedAccount.update({ where: { id: stored.id }, data: { status: "ERROR" } });
      throwMetaGraphError(payload, "META_API_ERROR", "Facebook connection could not be validated.");
    }
    await prisma.connectedAccount.update({ where: { id: stored.id }, data: { status: "CONNECTED" } });
    return true;
  }

  async getAccountInfo(account: ConnectionInfo) {
    const stored = await loadAccount(account);
    const token = await getValidMetaPageToken(stored);
    const pageId = pageIdFor(stored);
    if (!pageId) {
      throw new AppError(400, "META_NOT_CONNECTED", "Facebook Page is not connected.");
    }
    const response = await metaFetch(
      `${META_GRAPH_BASE}/${pageId}?fields=id,name&access_token=${encodeURIComponent(token)}`,
    );
    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
      name?: string;
      error?: { message?: string; code?: number };
    };
    if (!response.ok || payload.error) {
      throwMetaGraphError(payload, "META_API_ERROR", "Failed to load Facebook Page information.");
    }
    const info = { externalAccountId: payload.id ?? pageId, displayName: payload.name ?? stored.displayName };
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
    if (publication.platform !== "FACEBOOK") {
      throw new AppError(400, "INVALID_PLATFORM", "Publication platform is not Facebook.");
    }
    if (!["SCHEDULED", "READY", "PENDING"].includes(publication.status)) {
      throw new AppError(400, "PUBLICATION_NOT_READY", "Publication is not ready to publish.");
    }
    if (publication.content.status !== "APPROVED" && publication.content.status !== "SCHEDULED") {
      throw new AppError(400, "PUBLICATION_NOT_READY", "Content is not approved for publication.");
    }
    if (!publication.connectedAccountId || !publication.connectedAccount) {
      throw new AppError(400, "META_NOT_CONNECTED", "Facebook is not connected.");
    }
    if (publication.connectedAccount.userId !== publication.userId) {
      throw new AppError(403, "UNAUTHORIZED_INTEGRATION", "Connected account does not belong to this user.");
    }
    if (publication.content.userId !== publication.userId) {
      throw new AppError(403, "UNAUTHORIZED_INTEGRATION", "Content does not belong to this user.");
    }
    return this.publishToPage(publication.connectedAccount, publication.content, publication.userId);
  }

  async publishToPage(
    account: ConnectedAccount,
    content: { userId: string; title: string; body: string | null; videoPath: string | null },
    userId: string,
  ) {
    const pageId = pageIdFor(account);
    if (!pageId) throw new AppError(400, "META_NOT_CONNECTED", "Facebook Page is not connected.");
    const token = await getValidMetaPageToken(account);
    const message = captionFor(content, 63206);

    if (content.videoPath) {
      const filePath = resolveOwnedVideoPath(userId, content.videoPath);
      const fileStat = await stat(filePath).catch(() => null);
      if (!fileStat) throw new AppError(400, "MEDIA_NOT_SUPPORTED", "A valid media file is required.");
      const buffer = await readFile(filePath);
      const form = new FormData();
      form.append("source", new Blob([buffer], { type: mimeFor(filePath) }), basename(filePath));
      form.append("title", content.title.slice(0, 255));
      form.append("description", message);
      const response = await metaFetch(
        `${META_GRAPH_BASE}/${pageId}/videos?access_token=${encodeURIComponent(token)}`,
        { method: "POST", body: form },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        id?: string;
        error?: { message?: string; code?: number; type?: string };
      };
      const externalId = payload.id;
      if (!response.ok || payload.error || !externalId) {
        throwMetaGraphError(payload, "FACEBOOK_PUBLISH_FAILED", "Facebook rejected the video publication.");
      }
      return { externalId, status: "PUBLISHED" as const };
    }

    const body = new URLSearchParams({ message });
    const response = await metaFetch(
      `${META_GRAPH_BASE}/${pageId}/feed?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      },
    );
    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
      error?: { message?: string; code?: number; type?: string };
    };
    const externalId = payload.id;
    if (!response.ok || payload.error || !externalId) {
      throwMetaGraphError(payload, "FACEBOOK_PUBLISH_FAILED", "Facebook rejected the publication.");
    }
    return { externalId, status: "PUBLISHED" as const };
  }
}
