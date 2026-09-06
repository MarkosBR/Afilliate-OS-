import { createHash } from "node:crypto";
import type { Request } from "express";
import { prisma } from "../../lib/prisma.js";

const DEDUPE_WINDOW_MS = 30_000;

function firstHeader(value: string | string[] | undefined) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

function truncate(value: string | null | undefined, max = 300) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function fingerprint(req: Request, slug: string) {
  const ua = truncate(firstHeader(req.headers["user-agent"]), 200) ?? "";
  const accept = truncate(firstHeader(req.headers.accept), 80) ?? "";
  const lang = truncate(firstHeader(req.headers["accept-language"]), 40) ?? "";
  return createHash("sha256").update(`${slug}|${ua}|${accept}|${lang}`).digest("hex").slice(0, 32);
}

export async function resolveTrackedLink(req: Request, slug: string) {
  const link = await prisma.affiliateLink.findUnique({
    where: { slug },
    select: {
      id: true,
      userId: true,
      productId: true,
      campaignId: true,
      url: true,
      status: true,
    },
  });
  if (!link || link.status !== "ACTIVE") return null;

  const query = req.query as Record<string, unknown>;
  const utmSource = truncate(typeof query.utm_source === "string" ? query.utm_source : null, 80);
  const utmMedium = truncate(typeof query.utm_medium === "string" ? query.utm_medium : null, 80);
  const utmCampaign = truncate(typeof query.utm_campaign === "string" ? query.utm_campaign : null, 80);
  const utmContent = truncate(typeof query.utm_content === "string" ? query.utm_content : null, 80);
  const utmTerm = truncate(typeof query.utm_term === "string" ? query.utm_term : null, 80);
  const referrer = truncate(firstHeader(req.headers.referer), 300);
  const userAgent = truncate(firstHeader(req.headers["user-agent"]), 300);
  const print = fingerprint(req, slug);

  const recent = await prisma.analyticsEvent.findFirst({
    where: {
      linkId: link.id,
      type: "CLICK",
      fingerprint: print,
      createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
    },
    select: { id: true },
  });

  if (!recent) {
    await prisma.$transaction([
      prisma.analyticsEvent.create({
        data: {
          userId: link.userId,
          productId: link.productId,
          campaignId: link.campaignId,
          linkId: link.id,
          type: "CLICK",
          referrer,
          userAgent,
          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
          utmTerm,
          fingerprint: print,
        },
      }),
      prisma.affiliateLink.update({
        where: { id: link.id },
        data: { clicks: { increment: 1 } },
      }),
    ]);
  }

  return link.url;
}
