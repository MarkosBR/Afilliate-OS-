import type { PublicationPlatform, PublicationStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { serializePublication } from "../../lib/serializers.js";
import { AppError } from "../../middleware/errorHandler.js";
import { createNotification } from "../notifications/notifications.service.js";
import { assertOwnedConnectedAccount } from "../integrations/integrations.service.js";
import { findDuePublicationsQuery } from "./platform.adapter.js";

const ACTIVE_STATUSES: PublicationStatus[] = ["PENDING", "SCHEDULED", "READY"];
const contentSelect = { id: true, title: true, status: true, kind: true, linkId: true } as const;

function parseScheduledAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, "INVALID_DATE", "Invalid scheduled date.");
  }
  if (date.getTime() <= Date.now()) {
    throw new AppError(400, "INVALID_DATE", "Scheduled date must be in the future.");
  }
  return date;
}

async function syncContentStatus(userId: string, contentId: string) {
  const remaining = await prisma.publication.count({
    where: { userId, contentId, status: { in: ACTIVE_STATUSES } },
  });
  const content = await prisma.content.findFirst({ where: { id: contentId, userId } });
  if (!content) return;
  if (remaining === 0 && content.status === "SCHEDULED") {
    await prisma.content.update({ where: { id: contentId }, data: { status: "APPROVED" } });
  }
}

export async function listPublications(userId: string) {
  const items = await prisma.publication.findMany({
    where: { userId },
    include: { content: { select: contentSelect } },
    orderBy: { scheduledAt: "asc" },
  });
  return items.map(serializePublication);
}

export async function getPublication(userId: string, id: string) {
  const item = await prisma.publication.findFirst({
    where: { id, userId },
    include: { content: { select: contentSelect } },
  });
  if (!item) throw new AppError(404, "NOT_FOUND", "Publication not found.");
  return serializePublication(item);
}

export async function listCalendar(
  userId: string,
  filters: { from?: string; to?: string; status?: PublicationStatus; platform?: PublicationPlatform },
) {
  const from = filters.from ? new Date(filters.from) : undefined;
  const to = filters.to ? new Date(filters.to) : undefined;
  if (from && Number.isNaN(from.getTime())) throw new AppError(400, "INVALID_DATE", "Invalid from date.");
  if (to && Number.isNaN(to.getTime())) throw new AppError(400, "INVALID_DATE", "Invalid to date.");

  const items = await prisma.publication.findMany({
    where: {
      userId,
      status: filters.status,
      platform: filters.platform,
      scheduledAt: from || to ? { gte: from, lte: to } : undefined,
    },
    include: { content: { select: contentSelect } },
    orderBy: { scheduledAt: "asc" },
  });
  return items.map(serializePublication);
}

export async function scheduleContent(
  userId: string,
  contentId: string,
  input: { platform: PublicationPlatform; scheduledAt: string; connectedAccountId?: string | null },
) {
  const content = await prisma.content.findFirst({ where: { id: contentId, userId } });
  if (!content) throw new AppError(404, "NOT_FOUND", "Content not found.");
  if (content.status === "DRAFT") {
    throw new AppError(400, "CONTENT_NOT_APPROVED", "Draft content must be approved before scheduling.");
  }
  if (content.status === "ARCHIVED") {
    throw new AppError(400, "CONTENT_ARCHIVED", "Archived content cannot be scheduled.");
  }
  if (content.status === "PUBLISHED") {
    throw new AppError(400, "CONTENT_PUBLISHED", "Published content cannot be scheduled again.");
  }

  const scheduledAt = parseScheduledAt(input.scheduledAt);
  let connectedAccountId: string | null = null;
  if (input.connectedAccountId) {
    const account = await assertOwnedConnectedAccount(userId, input.connectedAccountId, input.platform);
    connectedAccountId = account.id;
  }
  const duplicate = await prisma.publication.findFirst({
    where: {
      userId,
      contentId,
      platform: input.platform,
      status: { in: ACTIVE_STATUSES },
    },
  });
  if (duplicate) {
    throw new AppError(409, "DUPLICATE_SCHEDULE", "This content is already scheduled for the selected platform.");
  }

  const publication = await prisma.$transaction(async (tx) => {
    const created = await tx.publication.create({
      data: {
        userId,
        contentId,
        connectedAccountId,
        platform: input.platform,
        scheduledAt,
        status: "SCHEDULED",
      },
      include: { content: { select: contentSelect } },
    });
    await tx.content.update({
      where: { id: contentId },
      data: { status: "SCHEDULED" },
    });
    return created;
  });

  await createNotification({
    userId,
    type: "CONTENT_SCHEDULED",
    title: "Conteudo agendado",
    body: `${content.title} agendado para ${input.platform}.`,
    metadata: { contentId, publicationId: publication.id, platform: input.platform },
  });

  return serializePublication(publication);
}

export async function cancelPublication(userId: string, id: string) {
  const existing = await prisma.publication.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Publication not found.");
  if (!ACTIVE_STATUSES.includes(existing.status)) {
    throw new AppError(400, "INVALID_STATUS", "Only pending or scheduled publications can be cancelled.");
  }

  const publication = await prisma.publication.update({
    where: { id },
    data: { status: "CANCELLED" },
    include: { content: { select: contentSelect } },
  });
  await syncContentStatus(userId, existing.contentId);
  return serializePublication(publication);
}

export function duePublicationsFilter() {
  return findDuePublicationsQuery();
}
