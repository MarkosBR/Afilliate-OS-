import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { serializeCampaign } from "../../lib/serializers.js";
import type { CampaignStatus } from "@prisma/client";

const productSelect = { id: true, name: true, platform: true };

export async function listCampaigns(userId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: { userId },
    include: { product: { select: productSelect } },
    orderBy: { createdAt: "desc" },
  });
  return campaigns.map(serializeCampaign);
}

export async function getCampaign(userId: string, id: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId },
    include: { product: { select: productSelect } },
  });
  if (!campaign) throw new AppError(404, "NOT_FOUND", "Campaign not found.");
  return serializeCampaign(campaign);
}

export async function createCampaign(
  userId: string,
  input: {
    productId: string;
    name: string;
    description?: string | null;
    budget: number;
    status?: CampaignStatus;
  },
) {
  const product = await prisma.product.findFirst({ where: { id: input.productId, userId } });
  if (!product) throw new AppError(400, "INVALID_PRODUCT", "Product not found.");

  const campaign = await prisma.campaign.create({
    data: {
      userId,
      productId: product.id,
      name: input.name,
      description: input.description ?? null,
      budget: input.budget,
      status: input.status ?? "DRAFT",
    },
    include: { product: { select: productSelect } },
  });
  return serializeCampaign(campaign);
}

export async function updateCampaign(
  userId: string,
  id: string,
  input: {
    productId?: string;
    name?: string;
    description?: string | null;
    budget?: number;
    status?: CampaignStatus;
  },
) {
  const existing = await prisma.campaign.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Campaign not found.");

  if (input.productId) {
    const product = await prisma.product.findFirst({ where: { id: input.productId, userId } });
    if (!product) throw new AppError(400, "INVALID_PRODUCT", "Product not found.");
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      productId: input.productId ?? existing.productId,
      name: input.name ?? existing.name,
      description: input.description === undefined ? existing.description : input.description,
      budget: input.budget ?? existing.budget,
      status: input.status ?? existing.status,
    },
    include: { product: { select: productSelect } },
  });
  return serializeCampaign(campaign);
}

export async function deleteCampaign(userId: string, id: string) {
  const existing = await prisma.campaign.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Campaign not found.");
  await prisma.campaign.delete({ where: { id } });
}
