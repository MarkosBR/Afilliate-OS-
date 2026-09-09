import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { createNotification } from "../notifications/notifications.service.js";
import { findDuePublicationsQuery, getPlatformAdapter } from "./platform.adapter.js";

export async function executeDuePublications(now = new Date(), userId?: string) {
  const due = await prisma.publication.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
      ...(userId ? { userId } : {}),
    },
    include: { content: true, connectedAccount: true },
  });

  const results = [];
  for (const publication of due) {
    try {
      if (publication.connectedAccount && publication.connectedAccount.userId !== publication.userId) {
        throw new AppError(403, "UNAUTHORIZED_INTEGRATION", "Connected account does not belong to this user.");
      }
      if (publication.content.userId !== publication.userId) {
        throw new AppError(403, "UNAUTHORIZED_INTEGRATION", "Content does not belong to this user.");
      }
      const adapter = getPlatformAdapter(publication.platform);
      await adapter.publish({
        publicationId: publication.id,
        contentId: publication.contentId,
        platform: publication.platform,
        scheduledAt: publication.scheduledAt,
      });
      results.push({ id: publication.id, status: "READY" as const });
    } catch (error) {
      const code = error instanceof AppError ? error.code : "PLATFORM_NOT_IMPLEMENTED";
      await prisma.publication.update({
        where: { id: publication.id },
        data: { status: "FAILED", errorMessage: code },
      });
      await prisma.content.update({
        where: { id: publication.contentId },
        data: { status: "FAILED" },
      });
      await createNotification({
        userId: publication.userId,
        type: "PUBLICATION_FAILED",
        title: "Publicacao nao enviada",
        body: "A plataforma ainda nao esta implementada.",
        metadata: { publicationId: publication.id, code },
      });
      results.push({ id: publication.id, status: "FAILED" as const, code });
    }
  }
  return results;
}
