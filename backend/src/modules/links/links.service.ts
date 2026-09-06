import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { normalizeSlug, serializeLink, slugify } from "../../lib/serializers.js";

const productSelect = { id: true, name: true, platform: true, affiliateUrl: true };
const campaignSelect = { id: true, name: true, status: true };
const include = {
  product: { select: productSelect },
  campaign: { select: campaignSelect },
};

async function assertUniqueSlug(slug: string, excludeId?: string) {
  const existing = await prisma.affiliateLink.findFirst({
    where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (existing) throw new AppError(409, "SLUG_TAKEN", "Slug already in use.");
}

async function resolveCampaign(userId: string, campaignId: string | null | undefined, productId: string) {
  if (!campaignId) return null;
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId } });
  if (!campaign) throw new AppError(400, "INVALID_CAMPAIGN", "Campaign not found.");
  if (campaign.productId !== productId) {
    throw new AppError(400, "INVALID_CAMPAIGN", "Campaign does not belong to this product.");
  }
  return campaign.id;
}

export async function listLinks(userId: string) {
  const links = await prisma.affiliateLink.findMany({
    where: { userId },
    include,
    orderBy: { createdAt: "desc" },
  });
  return links.map(serializeLink);
}

export async function getLink(userId: string, id: string) {
  const link = await prisma.affiliateLink.findFirst({
    where: { id, userId },
    include,
  });
  if (!link) throw new AppError(404, "NOT_FOUND", "Link not found.");
  return serializeLink(link);
}

export async function getLinkStats(userId: string, id: string, days = 7) {
  const link = await prisma.affiliateLink.findFirst({
    where: { id, userId },
    include,
  });
  if (!link) throw new AppError(404, "NOT_FOUND", "Link not found.");

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (Math.max(1, days) - 1));

  const events = await prisma.analyticsEvent.findMany({
    where: { userId, linkId: id, type: "CLICK" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      referrer: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      utmContent: true,
      utmTerm: true,
    },
  });

  const periodClicks = await prisma.analyticsEvent.count({
    where: { userId, linkId: id, type: "CLICK", createdAt: { gte: since } },
  });

  const origins = new Map<string, number>();
  const utms = new Map<string, number>();
  for (const event of events) {
    const origin = event.referrer || event.utmSource || "direct";
    origins.set(origin, (origins.get(origin) ?? 0) + 1);
    const utm = [event.utmSource, event.utmMedium, event.utmCampaign].filter(Boolean).join(" / ");
    if (utm) utms.set(utm, (utms.get(utm) ?? 0) + 1);
  }

  return {
    link: serializeLink(link),
    clicks: link.clicks,
    periodClicks,
    recentClicks: events.map((event) => ({
      id: event.id,
      createdAt: event.createdAt.toISOString(),
      referrer: event.referrer,
      utmSource: event.utmSource,
      utmMedium: event.utmMedium,
      utmCampaign: event.utmCampaign,
      utmContent: event.utmContent,
      utmTerm: event.utmTerm,
    })),
    origins: [...origins.entries()].map(([label, count]) => ({ label, count })).slice(0, 8),
    utmCampaigns: [...utms.entries()].map(([label, count]) => ({ label, count })).slice(0, 8),
  };
}

export async function createLink(
  userId: string,
  input: {
    productId: string;
    name: string;
    url?: string;
    slug?: string;
    status?: "ACTIVE" | "INACTIVE";
    campaignId?: string | null;
  },
) {
  const product = await prisma.product.findFirst({ where: { id: input.productId, userId } });
  if (!product) throw new AppError(400, "INVALID_PRODUCT", "Product not found.");

  let slug: string;
  try {
    slug = input.slug ? normalizeSlug(input.slug) : slugify(input.name);
  } catch {
    throw new AppError(400, "INVALID_SLUG", "Invalid slug.");
  }
  await assertUniqueSlug(slug);
  const campaignId = await resolveCampaign(userId, input.campaignId, product.id);

  const link = await prisma.affiliateLink.create({
    data: {
      userId,
      productId: product.id,
      campaignId,
      name: input.name,
      slug,
      url: input.url || product.affiliateUrl,
      status: input.status ?? "ACTIVE",
    },
    include,
  });
  return serializeLink(link);
}

export async function updateLink(
  userId: string,
  id: string,
  input: {
    productId?: string;
    name?: string;
    url?: string;
    slug?: string;
    status?: "ACTIVE" | "INACTIVE";
    campaignId?: string | null;
  },
) {
  const existing = await prisma.affiliateLink.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Link not found.");

  const productId = input.productId ?? existing.productId;
  if (input.productId) {
    const product = await prisma.product.findFirst({ where: { id: input.productId, userId } });
    if (!product) throw new AppError(400, "INVALID_PRODUCT", "Product not found.");
  }

  let slug = existing.slug;
  if (input.slug) {
    try {
      slug = normalizeSlug(input.slug);
    } catch {
      throw new AppError(400, "INVALID_SLUG", "Invalid slug.");
    }
    if (slug !== existing.slug) await assertUniqueSlug(slug, id);
  }

  const campaignId =
    input.campaignId === undefined
      ? existing.campaignId
      : await resolveCampaign(userId, input.campaignId, productId);

  const link = await prisma.affiliateLink.update({
    where: { id },
    data: {
      productId,
      campaignId,
      name: input.name ?? existing.name,
      url: input.url ?? existing.url,
      slug,
      status: input.status ?? existing.status,
    },
    include,
  });
  return serializeLink(link);
}

export async function deleteLink(userId: string, id: string) {
  const existing = await prisma.affiliateLink.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Link not found.");
  await prisma.affiliateLink.delete({ where: { id } });
}
