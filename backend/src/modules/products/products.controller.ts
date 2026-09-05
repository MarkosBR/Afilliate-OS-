import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../lib/http.js";
import { routeId } from "../../lib/params.js";
import { productSchema, productUpdateSchema } from "./products.schemas.js";
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "./products.service.js";

export async function listProductsController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await listProducts(req.user!.id));
  } catch (error) {
    next(error);
  }
}

export async function getProductController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await getProduct(req.user!.id, routeId(req)));
  } catch (error) {
    next(error);
  }
}

export async function createProductController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = productSchema.parse(req.body);
    const product = await createProduct(req.user!.id, {
      userId: req.user!.id,
      name: input.name,
      description: input.description ?? null,
      platform: input.platform,
      externalId: input.externalId ?? null,
      affiliateUrl: input.affiliateUrl,
      commission: input.commission,
      status: input.status,
    });
    return sendSuccess(res, product, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateProductController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = productUpdateSchema.parse(req.body);
    const product = await updateProduct(req.user!.id, routeId(req), input);
    return sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
}

export async function deleteProductController(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteProduct(req.user!.id, routeId(req));
    return sendSuccess(res, { ok: true });
  } catch (error) {
    next(error);
  }
}
