import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import type { AnalyticsQuery } from "./analytics.schemas.js";

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function resolvePeriod(query: AnalyticsQuery) {
  const now = new Date();
  if (query.from && query.to) {
    return { from: startOfDay(parseDay(query.from)), to: endOfDay(parseDay(query.to)) };
  }
  if (query.range === "today") {
    return { from: startOfDay(now), to: endOfDay(now) };
  }
  const days =
    query.range === "30d"
      ? 30
      : query.range === "14d"
        ? 14
        : query.days && [7, 14, 30].includes(query.days)
          ? query.days
          : 7;
  const from = startOfDay(now);
  from.setDate(from.getDate() - (days - 1));
  return { from, to: endOfDay(now) };
}

function eachDay(from: Date, to: Date) {
  const days: string[] = [];
  const cursor = startOfDay(from);
  const last = startOfDay(to);
  while (cursor <= last) {
    days.push(dateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function clickWhere(
  userId: string | undefined,
  query: AnalyticsQuery,
  from: Date,
  to: Date,
): Prisma.AnalyticsEventWhereInput {
  return {
    type: "CLICK",
    createdAt: { gte: from, lte: to },
    ...(userId ? { userId } : {}),
    ...(query.linkId ? { linkId: query.linkId } : {}),
    ...(query.campaignId ? { campaignId: query.campaignId } : {}),
    ...(query.utmSource ? { utmSource: query.utmSource } : {}),
    ...(query.utmMedium ? { utmMedium: query.utmMedium } : {}),
    ...(query.utmCampaign ? { utmCampaign: query.utmCampaign } : {}),
  };
}

async function uniqueClicks(where: Prisma.AnalyticsEventWhereInput) {
  const rows = await prisma.analyticsEvent.findMany({
    where: { ...where, fingerprint: { not: null } },
    distinct: ["fingerprint"],
    select: { fingerprint: true },
  });
  return rows.length;
}

async function groupCount(where: Prisma.AnalyticsEventWhereInput, by: Prisma.AnalyticsEventScalarFieldEnum) {
  const rows = await prisma.analyticsEvent.groupBy({
    by: [by],
    where,
    _count: { _all: true },
    orderBy: { _count: { id: "desc" } },
    take: 8,
  });
  return rows.map((row) => ({
    key: ((row[by] as string | null) || "direct") as string,
    count: row._count._all,
  }));
}

function emptySeries(from: Date, to: Date) {
  return eachDay(from, to).map((date) => ({ date, clicks: 0, conversions: 0, revenue: 0 }));
}

export async function getAnalyticsSummary(userId: string, since?: Date) {
  const createdAt = since ? { gte: since } : undefined;
  const clickWhereUser: Prisma.AnalyticsEventWhereInput = {
    userId,
    type: "CLICK",
    ...(createdAt ? { createdAt } : {}),
  };
  const [products, links, campaigns, activeProducts, activeCampaigns, activeLinks, clicks, unique, conversions, revenue] =
    await Promise.all([
      prisma.product.count({ where: { userId } }),
      prisma.affiliateLink.count({ where: { userId } }),
      prisma.campaign.count({ where: { userId } }),
      prisma.product.count({ where: { userId, status: "ACTIVE" } }),
      prisma.campaign.count({ where: { userId, status: "ACTIVE" } }),
      prisma.affiliateLink.count({ where: { userId, status: "ACTIVE" } }),
      prisma.analyticsEvent.count({ where: clickWhereUser }),
      uniqueClicks(clickWhereUser),
      prisma.analyticsEvent.count({
        where: { userId, type: "CONVERSION", ...(createdAt ? { createdAt } : {}) },
      }),
      prisma.analyticsEvent.aggregate({
        where: { userId, type: "CONVERSION", ...(createdAt ? { createdAt } : {}) },
        _sum: { revenue: true },
      }),
    ]);

  const revenueValue = Number(revenue._sum.revenue ?? 0);
  const ctr = clicks === 0 ? 0 : Number(((conversions / clicks) * 100).toFixed(2));

  return {
    products,
    links,
    campaigns,
    activeProducts,
    activeCampaigns,
    activeLinks,
    clicks,
    uniqueClicks: unique,
    conversions,
    revenue: revenueValue,
    ctr,
  };
}

async function buildReport(userId: string | undefined, query: AnalyticsQuery) {
  const { from, to } = resolvePeriod(query);
  const where = clickWhere(userId, query, from, to);
  const ownerFilter = userId ? { userId } : {};

  const [clicks, unique, activeLinks, activeCampaigns, clickDays, sourceRows, referrerRows, mediumRows, campaignUtmRows, linkGroups, campaignGroups] =
    await Promise.all([
      prisma.analyticsEvent.count({ where }),
      uniqueClicks(where),
      prisma.affiliateLink.count({ where: { ...ownerFilter, status: "ACTIVE" } }),
      prisma.campaign.count({ where: { ...ownerFilter, status: "ACTIVE" } }),
      prisma.analyticsEvent.findMany({
        where,
        select: { createdAt: true },
      }),
      groupCount(where, "utmSource"),
      groupCount(where, "referrer"),
      groupCount(where, "utmMedium"),
      groupCount(where, "utmCampaign"),
      prisma.analyticsEvent.groupBy({
        by: ["linkId"],
        where: { ...where, linkId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
        take: 8,
      }),
      prisma.analyticsEvent.groupBy({
        by: ["campaignId"],
        where: { ...where, campaignId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
        take: 8,
      }),
    ]);

  const seriesMap = new Map(emptySeries(from, to).map((point) => [point.date, point]));
  for (const event of clickDays) {
    const key = dateKey(event.createdAt);
    const bucket = seriesMap.get(key);
    if (bucket) bucket.clicks += 1;
  }

  const linkIds = linkGroups.map((row) => row.linkId).filter((id): id is string => Boolean(id));
  const campaignIds = campaignGroups.map((row) => row.campaignId).filter((id): id is string => Boolean(id));
  const [links, campaigns] = await Promise.all([
    linkIds.length
      ? prisma.affiliateLink.findMany({
          where: { id: { in: linkIds }, ...ownerFilter },
          select: { id: true, name: true, slug: true },
        })
      : Promise.resolve([]),
    campaignIds.length
      ? prisma.campaign.findMany({
          where: { id: { in: campaignIds }, ...ownerFilter },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);
  const linkName = new Map(links.map((item) => [item.id, item]));
  const campaignName = new Map(campaigns.map((item) => [item.id, item]));

  const topSources = sourceRows
    .map((row) => ({ label: row.key || "direct", count: row.count }))
    .sort((a, b) => b.count - a.count);
  const topReferrers = referrerRows
    .map((row) => ({ label: row.key || "direct", count: row.count }))
    .sort((a, b) => b.count - a.count);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    summary: {
      clicks,
      uniqueClicks: unique,
      activeLinks,
      activeCampaigns,
      topSource: topSources[0]?.label ?? "direct",
    },
    series: [...seriesMap.values()],
    topLinks: linkGroups.map((row) => ({
      id: row.linkId ?? "unknown",
      name: row.linkId ? (linkName.get(row.linkId)?.name ?? "Link") : "Link",
      slug: row.linkId ? linkName.get(row.linkId)?.slug : undefined,
      clicks: row._count._all,
    })),
    topCampaigns: campaignGroups.map((row) => ({
      id: row.campaignId ?? "unknown",
      name: row.campaignId ? (campaignName.get(row.campaignId)?.name ?? "Campanha") : "Campanha",
      clicks: row._count._all,
    })),
    topSources,
    topReferrers,
    utmSources: sourceRows.map((row) => ({ label: row.key, count: row.count })),
    utmMediums: mediumRows.map((row) => ({ label: row.key, count: row.count })),
    utmCampaigns: campaignUtmRows.map((row) => ({ label: row.key, count: row.count })),
  };
}

export async function getDashboardOverview(userId: string, days = 7) {
  const query: AnalyticsQuery = { days, range: days === 30 ? "30d" : days === 14 ? "14d" : "7d" };
  const report = await buildReport(userId, query);
  const since = resolvePeriod(query).from;
  const [summary, recentCampaigns, recentProducts, recentLinks, recentCampaignCreates, events] = await Promise.all([
    getAnalyticsSummary(userId, since),
    prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { product: { select: { id: true, name: true, platform: true } } },
    }),
    prisma.product.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.affiliateLink.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.campaign.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.analyticsEvent.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { product: { select: { name: true } }, campaign: { select: { name: true } } },
    }),
  ]);

  const recentActivity = [
    ...events.map((event) => ({
      id: event.id,
      type: event.type,
      label: event.product?.name ?? event.campaign?.name ?? event.type,
      createdAt: event.createdAt.toISOString(),
    })),
    ...recentProducts.map((item) => ({
      id: `product-${item.id}`,
      type: "PRODUCT" as const,
      label: item.name,
      createdAt: item.createdAt.toISOString(),
    })),
    ...recentCampaignCreates.map((item) => ({
      id: `campaign-${item.id}`,
      type: "CAMPAIGN" as const,
      label: item.name,
      createdAt: item.createdAt.toISOString(),
    })),
    ...recentLinks.map((item) => ({
      id: `link-${item.id}`,
      type: "LINK" as const,
      label: item.name,
      createdAt: item.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  return {
    summary: { ...summary, uniqueClicks: report.summary.uniqueClicks, clicks: report.summary.clicks },
    series: report.series,
    recentCampaigns: recentCampaigns.map((campaign) => ({
      id: campaign.id,
      userId: campaign.userId,
      productId: campaign.productId,
      name: campaign.name,
      description: campaign.description,
      budget: Number(campaign.budget),
      status: campaign.status,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
      product: campaign.product,
    })),
    topProducts: [],
    topLinks: report.topLinks.map((link) => ({
      id: link.id,
      name: link.name,
      slug: link.slug ?? "",
      clicks: link.clicks,
      status: "ACTIVE" as const,
    })),
    recentActivity,
    report,
  };
}

export async function getFilteredAnalytics(userId: string, query: AnalyticsQuery) {
  if (query.linkId) {
    const owned = await prisma.affiliateLink.findFirst({ where: { id: query.linkId, userId }, select: { id: true } });
    if (!owned) throw new AppError(404, "NOT_FOUND", "Link not found.");
  }
  if (query.campaignId) {
    const owned = await prisma.campaign.findFirst({ where: { id: query.campaignId, userId }, select: { id: true } });
    if (!owned) throw new AppError(404, "NOT_FOUND", "Campaign not found.");
  }

  const report = await buildReport(userId, query);
  const { from, to } = resolvePeriod(query);
  const where = clickWhere(userId, query, from, to);
  const productGroups = await prisma.analyticsEvent.groupBy({
    by: ["productId"],
    where: { ...where, productId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { id: "desc" } },
    take: 12,
  });
  const productIds = productGroups.map((row) => row.productId).filter((id): id is string => Boolean(id));
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds }, userId }, select: { id: true, name: true } })
    : [];
  const productName = new Map(products.map((item) => [item.id, item.name]));
  const totals = await getAnalyticsSummary(userId, from);

  return {
    ...report,
    totals: { ...totals, uniqueClicks: report.summary.uniqueClicks, clicks: report.summary.clicks },
    clicksByProduct: productGroups.map((row) => ({
      id: row.productId ?? "unknown",
      name: row.productId ? (productName.get(row.productId) ?? "Produto") : "Produto",
      clicks: row._count._all,
    })),
    clicksByLink: report.topLinks.map((link) => ({
      id: link.id,
      name: link.name,
      slug: link.slug ?? "",
      clicks: link.clicks,
      totalClicks: link.clicks,
    })),
  };
}

export async function getAnalyticsBreakdown(userId: string, days = 7) {
  const query: AnalyticsQuery = { days, range: days === 30 ? "30d" : days === 14 ? "14d" : "7d" };
  const report = await getFilteredAnalytics(userId, query);
  return {
    summary: report.totals,
    days: days === 30 ? 30 : days === 14 ? 14 : 7,
    clicksByProduct: report.clicksByProduct,
    clicksByLink: report.clicksByLink,
    origins: report.topSources,
    utmCampaigns: report.utmCampaigns,
  };
}

export async function getLinkAnalytics(userId: string, linkId: string, query: AnalyticsQuery) {
  const link = await prisma.affiliateLink.findFirst({
    where: { id: linkId, userId },
    include: {
      product: { select: { id: true, name: true, platform: true } },
      campaign: { select: { id: true, name: true, status: true } },
    },
  });
  if (!link) throw new AppError(404, "NOT_FOUND", "Link not found.");
  const report = await getFilteredAnalytics(userId, { ...query, linkId });
  const { from, to } = resolvePeriod(query);
  const recentClicks = await prisma.analyticsEvent.findMany({
    where: clickWhere(userId, { ...query, linkId }, from, to),
    orderBy: { createdAt: "desc" },
    take: 30,
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
  return {
    link: {
      id: link.id,
      name: link.name,
      slug: link.slug,
      url: link.url,
      status: link.status,
      clicks: link.clicks,
      trackUrl: `/go/${link.slug}`,
      product: link.product,
      campaign: link.campaign,
    },
    ...report,
    recentClicks: recentClicks.map((event) => ({
      id: event.id,
      createdAt: event.createdAt.toISOString(),
      referrer: event.referrer,
      utmSource: event.utmSource,
      utmMedium: event.utmMedium,
      utmCampaign: event.utmCampaign,
      utmContent: event.utmContent,
      utmTerm: event.utmTerm,
    })),
  };
}

export async function getCampaignAnalytics(userId: string, campaignId: string, query: AnalyticsQuery) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    include: { product: { select: { id: true, name: true, platform: true } } },
  });
  if (!campaign) throw new AppError(404, "NOT_FOUND", "Campaign not found.");
  const report = await getFilteredAnalytics(userId, { ...query, campaignId });
  const links = await prisma.affiliateLink.findMany({
    where: { userId, campaignId },
    select: { id: true, name: true, slug: true, clicks: true, status: true },
    orderBy: { clicks: "desc" },
  });
  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      product: campaign.product,
    },
    links,
    ...report,
  };
}

export async function getAdminAnalytics(query: AnalyticsQuery) {
  return buildReport(undefined, query);
}
