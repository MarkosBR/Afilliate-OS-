import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { createNotification } from "../notifications/notifications.service.js";
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
    const updated = await prisma.publication.update({
      where: { id: publication.id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        externalId: result.externalId,
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
      metadata: { publicationId: publication.id, externalId: result.externalId },
    });
    return { id: updated.id, status: "PUBLISHED" as const, externalId: result.externalId };
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
