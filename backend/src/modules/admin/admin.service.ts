import type { Prisma, ProductStatus, User, UserRole, UserStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { serializeCampaign, serializeProduct, serializeUser } from "../../lib/serializers.js";

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 50;

function pageParams(page?: number, pageSize?: number) {
  const safePage = Math.max(1, page ?? 1);
  const take = Math.min(PAGE_SIZE_MAX, Math.max(1, pageSize ?? PAGE_SIZE_DEFAULT));
  return { skip: (safePage - 1) * take, take, page: safePage, pageSize: take };
}

export async function writeAdminLog(input: {
  adminUserId: string;
  action: string;
  targetUserId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  await prisma.adminLog.create({
    data: {
      adminUserId: input.adminUserId,
      action: input.action,
      targetUserId: input.targetUserId ?? null,
      metadata:
        input.metadata === undefined || input.metadata === null
          ? undefined
          : (input.metadata as Prisma.InputJsonValue),
    },
  });
}

export function serializeAdminLog(log: {
  id: string;
  adminUserId: string;
  action: string;
  targetUserId: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  admin?: { id: string; name: string; email: string };
  target?: { id: string; name: string; email: string } | null;
}) {
  return {
    id: log.id,
    adminUserId: log.adminUserId,
    action: log.action,
    targetUserId: log.targetUserId,
    metadata:
      log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
        ? (log.metadata as Record<string, unknown>)
        : null,
    createdAt: log.createdAt.toISOString(),
    admin: log.admin,
    target: log.target ?? null,
  };
}

export async function getAdminDashboard() {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const [users, activeUsers, newUsers, products, campaigns, links, recentLogs] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.product.count(),
    prisma.campaign.count(),
    prisma.affiliateLink.count(),
    prisma.adminLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        admin: { select: { id: true, name: true, email: true } },
        target: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    users,
    activeUsers,
    newUsers,
    products,
    campaigns,
    links,
    recentLogs: recentLogs.map(serializeAdminLog),
  };
}

export async function listAdminUsers(input: {
  q?: string;
  status?: UserStatus;
  role?: UserRole;
  page?: number;
  pageSize?: number;
}) {
  const { skip, take, page, pageSize } = pageParams(input.page, input.pageSize);
  const where: Prisma.UserWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.role ? { role: input.role } : {}),
    ...(input.q
      ? {
          OR: [
            { name: { contains: input.q, mode: "insensitive" } },
            { email: { contains: input.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
  ]);

  return { items: users.map(serializeUser), total, page, pageSize };
}

export async function getAdminUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, "NOT_FOUND", "User not found.");
  return serializeUser(user);
}

export async function updateAdminUser(
  actor: User,
  id: string,
  input: { status?: UserStatus; role?: UserRole },
) {
  if (actor.id === id && input.role && input.role !== actor.role) {
    throw new AppError(400, "INVALID_ROLE", "You cannot change your own role.");
  }
  if (actor.id === id && input.status && input.status !== "ACTIVE") {
    throw new AppError(400, "INVALID_STATUS", "You cannot deactivate your own account.");
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "User not found.");

  if (existing.role === "ADMIN" && input.role === "USER") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      throw new AppError(400, "LAST_ADMIN", "The last administrator cannot be demoted.");
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      status: input.status ?? existing.status,
      role: input.role ?? existing.role,
    },
  });

  if (input.status && input.status !== existing.status) {
    await writeAdminLog({
      adminUserId: actor.id,
      action: input.status === "ACTIVE" ? "USER_ACTIVATED" : input.status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_STATUS_CHANGED",
      targetUserId: id,
      metadata: { from: existing.status, to: input.status },
    });
  }
  if (input.role && input.role !== existing.role) {
    await writeAdminLog({
      adminUserId: actor.id,
      action: "USER_ROLE_CHANGED",
      targetUserId: id,
      metadata: { from: existing.role, to: input.role },
    });
  }

  return serializeUser(updated);
}

export async function listAdminProducts(input: {
  q?: string;
  status?: ProductStatus;
  page?: number;
  pageSize?: number;
}) {
  const { skip, take, page, pageSize } = pageParams(input.page, input.pageSize);
  const where: Prisma.ProductWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.q
      ? {
          OR: [
            { name: { contains: input.q, mode: "insensitive" } },
            { user: { email: { contains: input.q, mode: "insensitive" } } },
            { user: { name: { contains: input.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  return {
    items: products.map((product) => ({
      ...serializeProduct(product),
      owner: product.user,
    })),
    total,
    page,
    pageSize,
  };
}

export async function updateAdminProductStatus(actor: User, id: string, status: ProductStatus) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Product not found.");
  const product = await prisma.product.update({ where: { id }, data: { status } });
  await writeAdminLog({
    adminUserId: actor.id,
    action: "PRODUCT_STATUS_CHANGED",
    targetUserId: existing.userId,
    metadata: { productId: id, from: existing.status, to: status },
  });
  return serializeProduct(product);
}

export async function listAdminCampaigns(input: {
  q?: string;
  status?: Prisma.CampaignWhereInput["status"];
  page?: number;
  pageSize?: number;
}) {
  const { skip, take, page, pageSize } = pageParams(input.page, input.pageSize);
  const where: Prisma.CampaignWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.q
      ? {
          OR: [
            { name: { contains: input.q, mode: "insensitive" } },
            { product: { name: { contains: input.q, mode: "insensitive" } } },
            { user: { email: { contains: input.q, mode: "insensitive" } } },
            { user: { name: { contains: input.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, campaigns] = await Promise.all([
    prisma.campaign.count({ where }),
    prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        product: { select: { id: true, name: true, platform: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    items: campaigns.map((campaign) => ({
      ...serializeCampaign(campaign),
      owner: campaign.user,
    })),
    total,
    page,
    pageSize,
  };
}

export async function listAdminLogs(input: { page?: number; pageSize?: number; action?: string }) {
  const { skip, take, page, pageSize } = pageParams(input.page, input.pageSize);
  const where: Prisma.AdminLogWhereInput = input.action ? { action: input.action } : {};
  const [total, logs] = await Promise.all([
    prisma.adminLog.count({ where }),
    prisma.adminLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        admin: { select: { id: true, name: true, email: true } },
        target: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);
  return { items: logs.map(serializeAdminLog), total, page, pageSize };
}
