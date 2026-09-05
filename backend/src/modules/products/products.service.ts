import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { serializeProduct } from "../../lib/serializers.js";
import type { Prisma } from "@prisma/client";

export async function listProducts(userId: string) {
  const products = await prisma.product.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return products.map(serializeProduct);
}

export async function getProduct(userId: string, id: string) {
  const product = await prisma.product.findFirst({ where: { id, userId } });
  if (!product) throw new AppError(404, "NOT_FOUND", "Product not found.");
  return serializeProduct(product);
}

export async function createProduct(userId: string, data: Prisma.ProductUncheckedCreateInput) {
  const product = await prisma.product.create({
    data: { ...data, userId },
  });
  return serializeProduct(product);
}

export async function updateProduct(
  userId: string,
  id: string,
  data: Prisma.ProductUncheckedUpdateInput,
) {
  const existing = await prisma.product.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Product not found.");
  const product = await prisma.product.update({ where: { id }, data });
  return serializeProduct(product);
}

export async function deleteProduct(userId: string, id: string) {
  const existing = await prisma.product.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Product not found.");
  await prisma.product.delete({ where: { id } });
}
