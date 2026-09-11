import type { ContentKind, ContentSource, ContentStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { serializeContent } from "../../lib/serializers.js";
import { removeUserVideo, saveUserVideo } from "../../lib/media.js";
import { createNotification } from "../notifications/notifications.service.js";

const include = {
  product: { select: { id: true, name: true, platform: true } },
  campaign: { select: { id: true, name: true, status: true } },
  link: { select: { id: true, name: true, slug: true } },
  publications: { orderBy: { scheduledAt: "desc" as const } },
} as const;

async function assertOwnedRelations(
  userId: string,
  input: { productId?: string | null; campaignId?: string | null; linkId?: string | null },
) {
  let productId = input.productId ?? null;
  if (input.productId) {
    const product = await prisma.product.findFirst({ where: { id: input.productId, userId } });
    if (!product) throw new AppError(400, "INVALID_PRODUCT", "Product not found.");
    productId = product.id;
  }

  if (input.campaignId) {
    const campaign = await prisma.campaign.findFirst({ where: { id: input.campaignId, userId } });
    if (!campaign) throw new AppError(400, "INVALID_CAMPAIGN", "Campaign not found.");
    if (productId && campaign.productId !== productId) {
      throw new AppError(400, "INVALID_CAMPAIGN", "Campaign does not belong to the selected product.");
    }
    if (!productId) productId = campaign.productId;
  }

  if (input.linkId) {
    const link = await prisma.affiliateLink.findFirst({ where: { id: input.linkId, userId } });
    if (!link) throw new AppError(400, "INVALID_LINK", "Link not found.");
    if (productId && link.productId !== productId) {
      throw new AppError(400, "INVALID_LINK", "Link does not belong to the selected product.");
    }
  }

  return productId;
}

export async function listContents(userId: string) {
  const items = await prisma.content.findMany({
    where: { userId },
    include,
    orderBy: { createdAt: "desc" },
  });
  return items.map(serializeContent);
}

export async function getContent(userId: string, id: string) {
  const item = await prisma.content.findFirst({ where: { id, userId }, include });
  if (!item) throw new AppError(404, "NOT_FOUND", "Content not found.");
  return serializeContent(item);
}

export async function createContent(
  userId: string,
  input: {
    productId?: string | null;
    campaignId?: string | null;
    linkId?: string | null;
    title: string;
    body?: string | null;
    kind?: ContentKind;
    channel?: string | null;
    tags?: string | null;
    videoPath?: string | null;
    videoFileName?: string | null;
    status?: ContentStatus;
    source?: ContentSource;
    generatedBy?: string | null;
  },
) {
  const productId = await assertOwnedRelations(userId, input);
  const item = await prisma.content.create({
    data: {
      userId,
      productId,
      campaignId: input.campaignId ?? null,
      linkId: input.linkId ?? null,
      title: input.title,
      body: input.body ?? null,
      kind: input.kind ?? "POST",
      channel: input.channel ?? null,
      tags: input.tags ?? null,
      videoPath: input.videoPath ?? null,
      videoFileName: input.videoFileName ?? null,
      status: "DRAFT",
      source: input.source ?? "MANUAL",
      generatedBy: input.source === "AI" ? input.generatedBy ?? null : null,
    },
    include,
  });
  return serializeContent(item);
}

export async function updateContent(
  userId: string,
  id: string,
  input: {
    productId?: string | null;
    campaignId?: string | null;
    linkId?: string | null;
    title?: string;
    body?: string | null;
    kind?: ContentKind;
    channel?: string | null;
    tags?: string | null;
    videoPath?: string | null;
    videoFileName?: string | null;
    status?: ContentStatus;
    source?: ContentSource;
    generatedBy?: string | null;
  },
) {
  const existing = await prisma.content.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Content not found.");

  const productId = await assertOwnedRelations(userId, {
    productId: input.productId === undefined ? existing.productId : input.productId,
    campaignId: input.campaignId === undefined ? existing.campaignId : input.campaignId,
    linkId: input.linkId === undefined ? existing.linkId : input.linkId,
  });

  const source = input.source ?? existing.source;
  if (input.status && input.status !== existing.status) {
    throw new AppError(400, "INVALID_STATUS", "Use approve, reject or schedule endpoints to change status.");
  }
  const item = await prisma.content.update({
    where: { id },
    data: {
      productId,
      campaignId: input.campaignId === undefined ? existing.campaignId : input.campaignId,
      linkId: input.linkId === undefined ? existing.linkId : input.linkId,
      title: input.title ?? existing.title,
      body: input.body === undefined ? existing.body : input.body,
      kind: input.kind ?? existing.kind,
      channel: input.channel === undefined ? existing.channel : input.channel,
      tags: input.tags === undefined ? existing.tags : input.tags,
      videoPath: input.videoPath === undefined ? existing.videoPath : input.videoPath,
      videoFileName: input.videoFileName === undefined ? existing.videoFileName : input.videoFileName,
      source,
      generatedBy: source === "AI" ? (input.generatedBy === undefined ? existing.generatedBy : input.generatedBy) : null,
    },
    include,
  });
  return serializeContent(item);
}

export async function approveContent(userId: string, id: string) {
  const existing = await prisma.content.findFirst({ where: { id, userId }, include });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Content not found.");
  if (existing.status !== "DRAFT" && existing.status !== "FAILED") {
    throw new AppError(400, "INVALID_STATUS", "Only draft or failed content can be approved.");
  }
  if (existing.kind === "VIDEO" && !existing.videoPath) {
    throw new AppError(400, "VIDEO_REQUIRED", "A video file is required before approval.");
  }
  const item = await prisma.content.update({
    where: { id },
    data: { status: "APPROVED" },
    include,
  });
  await createNotification({
    userId,
    type: "CONTENT_APPROVED",
    title: "Conteudo aprovado",
    body: `${item.title} esta pronto para agendamento.`,
    metadata: { contentId: item.id },
  });
  return serializeContent(item);
}

export async function rejectContent(userId: string, id: string) {
  const existing = await prisma.content.findFirst({ where: { id, userId }, include });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Content not found.");
  if (existing.status === "PUBLISHED") {
    throw new AppError(400, "INVALID_STATUS", "Published content cannot return to draft.");
  }
  const active = existing.publications.filter((item) => ["PENDING", "SCHEDULED", "READY"].includes(item.status));
  if (active.length) {
    await prisma.publication.updateMany({
      where: { id: { in: active.map((item) => item.id) } },
      data: { status: "CANCELLED" },
    });
  }
  const item = await prisma.content.update({
    where: { id },
    data: { status: "DRAFT" },
    include,
  });
  await createNotification({
    userId,
    type: "CONTENT_REJECTED",
    title: "Conteudo voltou para rascunho",
    body: `${item.title} precisa de revisao.`,
    metadata: { contentId: item.id },
  });
  return serializeContent(item);
}

export async function deleteContent(userId: string, id: string) {
  const existing = await prisma.content.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Content not found.");
  await removeUserVideo(userId, existing.videoPath);
  await prisma.content.delete({ where: { id } });
}

export async function attachContentVideo(userId: string, id: string, file: { filename: string; buffer: Buffer }) {
  const existing = await prisma.content.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Content not found.");
  if (existing.status === "PUBLISHED") {
    throw new AppError(400, "INVALID_STATUS", "Published content cannot receive a new video.");
  }
  await removeUserVideo(userId, existing.videoPath);
  const stored = await saveUserVideo(userId, file.filename, file.buffer);
  const item = await prisma.content.update({
    where: { id },
    data: {
      videoPath: `${userId}/${stored.storedName}`,
      videoFileName: stored.originalName,
      kind: existing.kind === "POST" ? "VIDEO" : existing.kind,
    },
    include,
  });
  return serializeContent(item);
}
