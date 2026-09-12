import type { ConnectedAccount, Content, Publication } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { createNotification } from "../notifications/notifications.service.js";
import { InstagramPlatformAdapter } from "../integrations/instagram.adapter.js";
import { TikTokPlatformAdapter } from "../integrations/tiktok.adapter.js";
import { getPlatformAdapter } from "./platform.adapter.js";

function safeErrorCode(error: unknown) {
  if (error instanceof AppError) return error.code;
  return "PLATFORM_NOT_IMPLEMENTED";
}

async function markFailed(publicationId: string, contentId: string, userId: string, code: string) {
  await prisma.publication.update({
    where: { id: publicationId },
    data: { status: "FAILED", errorMessage: code },
  });
  await prisma.content.update({
    where: { id: contentId },
    data: { status: "FAILED" },
  });
  await createNotification({
    userId,
    type: "PUBLICATION_FAILED",
    title: "Publicacao falhou",
    body: "A publicacao nao foi enviada.",
    metadata: { publicationId, code },
  });
}

async function markPublished(publication: Publication & { content: Content }, externalId: string) {
  const updated = await prisma.publication.update({
    where: { id: publication.id },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      externalId,
      errorMessage: null,
    },
  });
  await prisma.content.update({
    where: { id: publication.contentId },
    data: { status: "PUBLISHED" },
  });
  await createNotification({
    userId: publication.userId,
    type: "PUBLICATION_PUBLISHED",
    title: "Publicacao enviada",
    body: `${publication.content.title} foi publicado.`,
    metadata: { publicationId: publication.id, externalId },
  });
  return { id: updated.id, status: "PUBLISHED" as const, externalId };
}

function processingCode(platform: Publication["platform"]) {
  if (platform === "TIKTOK") return "TIKTOK_PROCESSING";
  if (platform === "INSTAGRAM") return "INSTAGRAM_PROCESSING";
  return "PROCESSING";
}

async function markProcessing(publicationId: string, externalId: string, platform: Publication["platform"]) {
  const updated = await prisma.publication.update({
    where: { id: publicationId },
    data: {
      status: "PENDING",
      externalId,
      errorMessage: processingCode(platform),
    },
  });
  return { id: updated.id, status: "PENDING" as const, externalId };
}

async function refreshAsyncPublication(
  publication: Publication & { content: Content; connectedAccount: ConnectedAccount },
) {
  if (!publication.externalId) {
    throw new AppError(400, "PUBLICATION_NOT_READY", "Publication is not ready to publish.");
  }
  if (publication.platform === "TIKTOK") {
    const adapter = getPlatformAdapter("TIKTOK");
    if (!(adapter instanceof TikTokPlatformAdapter)) {
      throw new AppError(501, "PLATFORM_NOT_IMPLEMENTED", "This platform is not implemented yet.");
    }
    const status = await adapter.fetchPublishStatus(publication.connectedAccount, publication.externalId);
    if (status.status === "PROCESSING") {
      return markProcessing(publication.id, status.externalId, "TIKTOK");
    }
    return markPublished(publication, status.externalId);
  }
  if (publication.platform === "INSTAGRAM") {
    const adapter = getPlatformAdapter("INSTAGRAM");
    if (!(adapter instanceof InstagramPlatformAdapter)) {
      throw new AppError(501, "PLATFORM_NOT_IMPLEMENTED", "This platform is not implemented yet.");
    }
    const status = await adapter.fetchPublishStatus(publication.connectedAccount, publication.externalId);
    if (status.status === "PROCESSING") {
      return markProcessing(publication.id, status.externalId, "INSTAGRAM");
    }
    return markPublished(publication, status.externalId);
  }
  throw new AppError(400, "PUBLICATION_NOT_READY", "Publication is not ready to publish.");
}

export async function executePublication(publicationId: string, actorUserId?: string) {
  const publication = await prisma.publication.findUnique({
    where: { id: publicationId },
    include: { content: true, connectedAccount: true },
  });
  if (!publication) throw new AppError(404, "NOT_FOUND", "Publication not found.");
  if (actorUserId && publication.userId !== actorUserId) {
    throw new AppError(404, "NOT_FOUND", "Publication not found.");
  }
  if (!["SCHEDULED", "READY", "PENDING"].includes(publication.status)) {
    throw new AppError(400, "PUBLICATION_NOT_READY", "Publication is not ready to publish.");
  }
  if (publication.content.userId !== publication.userId) {
    throw new AppError(403, "UNAUTHORIZED_INTEGRATION", "Content does not belong to this user.");
  }
  if (publication.connectedAccount && publication.connectedAccount.userId !== publication.userId) {
    throw new AppError(403, "UNAUTHORIZED_INTEGRATION", "Connected account does not belong to this user.");
  }
  if (publication.content.status !== "APPROVED" && publication.content.status !== "SCHEDULED") {
    throw new AppError(400, "PUBLICATION_NOT_READY", "Content is not approved for publication.");
  }

  if (
    publication.status === "PENDING" &&
    (publication.platform === "TIKTOK" || publication.platform === "INSTAGRAM") &&
    publication.externalId &&
    publication.connectedAccount
  ) {
    try {
      return await refreshAsyncPublication({
        ...publication,
        connectedAccount: publication.connectedAccount,
      });
    } catch (error) {
      const code = safeErrorCode(error);
      await markFailed(publication.id, publication.contentId, publication.userId, code);
      if (error instanceof AppError) throw error;
      throw new AppError(502, code, "Publication failed.");
    }
  }

  try {
    const adapter = getPlatformAdapter(publication.platform);
    if (publication.connectedAccount) {
      await adapter.validateConnection({
        id: publication.connectedAccount.id,
        platform: publication.connectedAccount.platform,
        status: publication.connectedAccount.status,
        displayName: publication.connectedAccount.displayName,
        externalAccountId: publication.connectedAccount.externalAccountId,
      });
    }
    const result = await adapter.publish({
      publicationId: publication.id,
      contentId: publication.contentId,
      platform: publication.platform,
      scheduledAt: publication.scheduledAt,
    });
    if (result.status === "PROCESSING") {
      return markProcessing(publication.id, result.externalId, publication.platform);
    }
    return markPublished(publication, result.externalId);
  } catch (error) {
    const code = safeErrorCode(error);
    await markFailed(publication.id, publication.contentId, publication.userId, code);
    if (error instanceof AppError) throw error;
    throw new AppError(502, code, "Publication failed.");
  }
}

export async function executeDuePublications(now = new Date(), userId?: string) {
  const due = await prisma.publication.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
      ...(userId ? { userId } : {}),
    },
    select: { id: true, userId: true },
  });

  const results = [];
  for (const publication of due) {
    try {
      const published = await executePublication(publication.id, userId);
      results.push({ id: published.id, status: published.status, externalId: published.externalId });
    } catch (error) {
      results.push({
        id: publication.id,
        status: "FAILED" as const,
        code: safeErrorCode(error),
      });
    }
  }
  return results;
}
