import type {
  AffiliateLink,
  Campaign,
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
  link: AffiliateLink & { product?: Pick<Product, "id" | "name" | "platform"> },
) {
  return {
    id: link.id,
    userId: link.userId,
    productId: link.productId,
    name: link.name,
    slug: link.slug,
    url: link.url,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
    product: link.product
      ? { id: link.product.id, name: link.product.name, platform: link.product.platform }
      : undefined,
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

export function slugify(value: string) {
  const base = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "link"}-${suffix}`;
}
