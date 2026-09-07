import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { createAiProvider, getAiStatus } from "./ai.factory.js";
import type { ContentKind, ContentTone } from "./ai.types.js";

export function readAiStatus() {
  return getAiStatus();
}

export async function generateForUser(
  userId: string,
  input: {
    productId: string;
    campaignId?: string | null;
    kind: ContentKind;
    tone: ContentTone;
    extraContext?: string | null;
  },
) {
  const product = await prisma.product.findFirst({ where: { id: input.productId, userId } });
  if (!product) throw new AppError(400, "INVALID_PRODUCT", "Product not found.");

  let campaignName: string | null = null;
  let campaignDescription: string | null = null;
  if (input.campaignId) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: input.campaignId, userId, productId: product.id },
    });
    if (!campaign) throw new AppError(400, "INVALID_CAMPAIGN", "Campaign not found.");
    campaignName = campaign.name;
    campaignDescription = campaign.description;
  }

  const provider = createAiProvider();
  const generated = await provider.generateContent({
    kind: input.kind,
    tone: input.tone,
    productName: product.name,
    productDescription: product.description,
    productPlatform: product.platform,
    campaignName,
    campaignDescription,
    extraContext: input.extraContext ?? null,
  });

  return {
    ...generated,
    provider: provider.name,
    kind: input.kind,
    tone: input.tone,
  };
}
