import type { ContentKind, ContentSource, ContentStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { serializeContent } from "../../lib/serializers.js";

const include = {
  product: { select: { id: true, name: true, platform: true } },
  campaign: { select: { id: true, name: true, status: true } },
  link: { select: { id: true, name: true, slug: true } },
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
      status: input.status ?? "DRAFT",
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
      status: input.status ?? existing.status,
      source,
      generatedBy: source === "AI" ? (input.generatedBy === undefined ? existing.generatedBy : input.generatedBy) : null,
    },
    include,
  });
  return serializeContent(item);
}

export async function deleteContent(userId: string, id: string) {
  const existing = await prisma.content.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Content not found.");
  await prisma.content.delete({ where: { id } });
}
