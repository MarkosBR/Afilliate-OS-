import { prisma } from "../../lib/prisma.js";

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getAnalyticsSummary(userId: string, since?: Date) {
  const createdAt = since ? { gte: since } : undefined;
  const [products, links, campaigns, activeProducts, activeCampaigns, activeLinks, clicks, conversions, revenue] =
    await Promise.all([
      prisma.product.count({ where: { userId } }),
      prisma.affiliateLink.count({ where: { userId } }),
      prisma.campaign.count({ where: { userId } }),
      prisma.product.count({ where: { userId, status: "ACTIVE" } }),
      prisma.campaign.count({ where: { userId, status: "ACTIVE" } }),
      prisma.affiliateLink.count({ where: { userId, status: "ACTIVE" } }),
      prisma.analyticsEvent.count({ where: { userId, type: "CLICK", ...(createdAt ? { createdAt } : {}) } }),
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
    conversions,
    revenue: revenueValue,
    ctr,
  };
}

export async function getDashboardOverview(userId: string, days = 7) {
  const safeDays = [7, 14, 30].includes(days) ? days : 7;
  const since = startOfDay(new Date());
  since.setDate(since.getDate() - (safeDays - 1));

  const [summary, events, recentCampaigns, products, recentProducts, recentLinks, recentCampaignCreates, topLinkRows] =
    await Promise.all([
      getAnalyticsSummary(userId, since),
      prisma.analyticsEvent.findMany({
        where: { userId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          product: { select: { name: true } },
          campaign: { select: { name: true } },
        },
      }),
      prisma.campaign.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { product: { select: { id: true, name: true, platform: true } } },
      }),
      prisma.product.findMany({
        where: { userId },
        select: { id: true, name: true, platform: true, status: true, commission: true, affiliateUrl: true, description: true, externalId: true, userId: true, createdAt: true, updatedAt: true },
      }),
      prisma.product.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.affiliateLink.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.campaign.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.affiliateLink.findMany({
        where: { userId },
        orderBy: { clicks: "desc" },
        take: 5,
        include: { product: { select: { id: true, name: true, platform: true } } },
      }),
    ]);

  const seriesMap = new Map<string, { clicks: number; conversions: number; revenue: number }>();
  for (let i = 0; i < safeDays; i += 1) {
    const day = new Date(since);
    day.setDate(since.getDate() + i);
    seriesMap.set(dateKey(day), { clicks: 0, conversions: 0, revenue: 0 });
  }

  const productStats = new Map<string, { conversions: number; revenue: number }>();
  for (const event of events) {
    const key = dateKey(event.createdAt);
    const bucket = seriesMap.get(key);
    if (bucket) {
      if (event.type === "CLICK") bucket.clicks += 1;
      if (event.type === "CONVERSION") {
        bucket.conversions += 1;
        bucket.revenue += Number(event.revenue);
      }
    }
    if (event.productId) {
      const current = productStats.get(event.productId) ?? { conversions: 0, revenue: 0 };
      if (event.type === "CONVERSION") {
        current.conversions += 1;
        current.revenue += Number(event.revenue);
      }
      productStats.set(event.productId, current);
    }
  }

  const series = [...seriesMap.entries()].map(([date, value]) => ({ date, ...value }));
  const topProducts = products
    .map((product) => ({
      id: product.id,
      userId: product.userId,
      name: product.name,
      description: product.description,
      platform: product.platform,
      externalId: product.externalId,
      affiliateUrl: product.affiliateUrl,
      commission: Number(product.commission),
      status: product.status,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      conversions: productStats.get(product.id)?.conversions ?? 0,
      revenue: productStats.get(product.id)?.revenue ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.conversions - a.conversions)
    .slice(0, 5);

  const recentActivity = [
    ...events.slice(0, 8).map((event) => ({
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
    summary,
    series,
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
    topProducts,
    topLinks: topLinkRows.map((link) => ({
      id: link.id,
      name: link.name,
      slug: link.slug,
      clicks: link.clicks,
      status: link.status,
      product: link.product,
    })),
    recentActivity,
  };
}

export async function getAnalyticsBreakdown(userId: string, days = 7) {
  const safeDays = [7, 14, 30].includes(days) ? days : 7;
  const since = startOfDay(new Date());
  since.setDate(since.getDate() - (safeDays - 1));
  const summary = await getAnalyticsSummary(userId, since);
  const events = await prisma.analyticsEvent.findMany({
    where: { userId, type: "CLICK", createdAt: { gte: since } },
    select: {
      productId: true,
      linkId: true,
      referrer: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      createdAt: true,
    },
  });

  const byProduct = new Map<string, number>();
  const byLink = new Map<string, number>();
  const origins = new Map<string, number>();
  const utms = new Map<string, number>();
  for (const event of events) {
    if (event.productId) byProduct.set(event.productId, (byProduct.get(event.productId) ?? 0) + 1);
    if (event.linkId) byLink.set(event.linkId, (byLink.get(event.linkId) ?? 0) + 1);
    const origin = event.utmSource || event.referrer || "direct";
    origins.set(origin, (origins.get(origin) ?? 0) + 1);
    const utm = [event.utmSource, event.utmMedium, event.utmCampaign].filter(Boolean).join(" / ");
    if (utm) utms.set(utm, (utms.get(utm) ?? 0) + 1);
  }

  const [products, links] = await Promise.all([
    prisma.product.findMany({ where: { userId }, select: { id: true, name: true } }),
    prisma.affiliateLink.findMany({ where: { userId }, select: { id: true, name: true, slug: true, clicks: true } }),
  ]);

  return {
    summary,
    days: safeDays,
    clicksByProduct: products
      .map((product) => ({ id: product.id, name: product.name, clicks: byProduct.get(product.id) ?? 0 }))
      .sort((a, b) => b.clicks - a.clicks),
    clicksByLink: links
      .map((link) => ({
        id: link.id,
        name: link.name,
        slug: link.slug,
        clicks: byLink.get(link.id) ?? 0,
        totalClicks: link.clicks,
      }))
      .sort((a, b) => b.clicks - a.clicks),
    origins: [...origins.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    utmCampaigns: [...utms.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
  };
}
