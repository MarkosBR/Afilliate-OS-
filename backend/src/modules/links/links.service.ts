import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { serializeLink, slugify } from "../../lib/serializers.js";

const productSelect = { id: true, name: true, platform: true, affiliateUrl: true };

export async function listLinks(userId: string) {
  const links = await prisma.affiliateLink.findMany({
    where: { userId },
    include: { product: { select: productSelect } },
    orderBy: { createdAt: "desc" },
  });
  return links.map(serializeLink);
}

export async function getLink(userId: string, id: string) {
  const link = await prisma.affiliateLink.findFirst({
    where: { id, userId },
    include: { product: { select: productSelect } },
  });
  if (!link) throw new AppError(404, "NOT_FOUND", "Link not found.");
  return serializeLink(link);
}

export async function createLink(
  userId: string,
  input: { productId: string; name: string; url?: string },
) {
  const product = await prisma.product.findFirst({ where: { id: input.productId, userId } });
  if (!product) throw new AppError(400, "INVALID_PRODUCT", "Product not found.");

  const link = await prisma.affiliateLink.create({
    data: {
      userId,
      productId: product.id,
      name: input.name,
      slug: slugify(input.name),
      url: input.url || product.affiliateUrl,
    },
    include: { product: { select: productSelect } },
  });
  return serializeLink(link);
}

export async function updateLink(
  userId: string,
  id: string,
  input: { productId?: string; name?: string; url?: string },
) {
  const existing = await prisma.affiliateLink.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Link not found.");

  if (input.productId) {
    const product = await prisma.product.findFirst({ where: { id: input.productId, userId } });
    if (!product) throw new AppError(400, "INVALID_PRODUCT", "Product not found.");
  }

  const link = await prisma.affiliateLink.update({
    where: { id },
    data: {
      productId: input.productId ?? existing.productId,
      name: input.name ?? existing.name,
      url: input.url ?? existing.url,
    },
    include: { product: { select: productSelect } },
  });
  return serializeLink(link);
}

export async function deleteLink(userId: string, id: string) {
  const existing = await prisma.affiliateLink.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Link not found.");
  await prisma.affiliateLink.delete({ where: { id } });
}
