import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { serializeNotification } from "../../lib/serializers.js";
import { AppError } from "../../middleware/errorHandler.js";

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  const item = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
  return serializeNotification(item);
}

export async function listNotifications(userId: string) {
  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return items.map(serializeNotification);
}

export async function markNotificationRead(userId: string, id: string) {
  const existing = await prisma.notification.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Notification not found.");
  const item = await prisma.notification.update({
    where: { id },
    data: { readAt: existing.readAt ?? new Date() },
  });
  return serializeNotification(item);
}
