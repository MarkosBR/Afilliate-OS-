import type {
  AffiliateLink,
  Campaign,
  Content,
  Product,
  User,
} from "@prisma/client";

export function serializeUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    plan: user.plan,
    status: user.status,
    role: user.role,
    lastLogin: user.lastLogin?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function serializeProduct(product: Product) {
  return {
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
  };
}

export function serializeLink(
  link: AffiliateLink & {
    product?: Pick<Product, "id" | "name" | "platform">;
    campaign?: Pick<Campaign, "id" | "name" | "status"> | null;
    _count?: { analyticsEvents?: number };
  },
) {
  return {
    id: link.id,
    userId: link.userId,
    productId: link.productId,
    campaignId: link.campaignId,
    name: link.name,
    slug: link.slug,
    url: link.url,
    status: link.status,
    clicks: link.clicks,
    trackUrl: `/go/${link.slug}`,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
    product: link.product
      ? { id: link.product.id, name: link.product.name, platform: link.product.platform }
      : undefined,
    campaign: link.campaign
      ? { id: link.campaign.id, name: link.campaign.name, status: link.campaign.status }
      : null,
  };
}

export function serializeCampaign(
  campaign: Campaign & { product?: Pick<Product, "id" | "name" | "platform"> },
) {
  return {
    id: campaign.id,
    userId: campaign.userId,
    productId: campaign.productId,
    name: campaign.name,
    description: campaign.description,
    budget: Number(campaign.budget),
    status: campaign.status,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
    product: campaign.product
      ? {
          id: campaign.product.id,
          name: campaign.product.name,
          platform: campaign.product.platform,
        }
      : undefined,
  };
}

export function serializeContent(
  content: Content & {
    product?: Pick<Product, "id" | "name" | "platform"> | null;
    campaign?: Pick<Campaign, "id" | "name" | "status"> | null;
    link?: Pick<AffiliateLink, "id" | "name" | "slug"> | null;
  },
) {
  return {
    id: content.id,
    userId: content.userId,
    productId: content.productId,
    campaignId: content.campaignId,
    linkId: content.linkId,
    title: content.title,
    body: content.body,
    kind: content.kind,
    channel: content.channel,
    status: content.status,
    source: content.source,
    generatedBy: content.generatedBy,
    createdAt: content.createdAt.toISOString(),
    updatedAt: content.updatedAt.toISOString(),
    product: content.product
      ? { id: content.product.id, name: content.product.name, platform: content.product.platform }
      : null,
    campaign: content.campaign
      ? { id: content.campaign.id, name: content.campaign.name, status: content.campaign.status }
      : null,
    link: content.link
      ? { id: content.link.id, name: content.link.name, slug: content.link.slug }
      : null,
  };
}

export function slugify(value: string, unique = true) {
  const base = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  if (!unique) return base || "link";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "link"}-${suffix}`;
}

export function normalizeSlug(value: string) {
  const slug = slugify(value, false);
  if (!slug || slug.length < 2) {
    throw new Error("INVALID_SLUG");
  }
  return slug;
}
