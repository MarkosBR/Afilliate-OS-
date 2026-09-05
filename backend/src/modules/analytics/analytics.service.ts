import { prisma } from "../../lib/prisma.js";

export async function getAnalyticsSummary(userId: string) {
  const [products, links, campaigns, clicks, conversions, revenue] = await Promise.all([
    prisma.product.count({ where: { userId } }),
    prisma.affiliateLink.count({ where: { userId } }),
    prisma.campaign.count({ where: { userId } }),
    prisma.analyticsEvent.count({ where: { userId, type: "CLICK" } }),
    prisma.analyticsEvent.count({ where: { userId, type: "CONVERSION" } }),
    prisma.analyticsEvent.aggregate({
      where: { userId, type: "CONVERSION" },
      _sum: { revenue: true },
    }),
  ]);

  const revenueValue = Number(revenue._sum.revenue ?? 0);
  const ctr = clicks === 0 ? 0 : Number(((conversions / clicks) * 100).toFixed(2));

  return {
    products,
    links,
    campaigns,
    clicks,
    conversions,
    revenue: revenueValue,
    ctr,
  };
}
