import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../lib/http.js";
import { routeId } from "../../lib/params.js";
import {
  adminCampaignsQuerySchema,
  adminLogsQuerySchema,
  adminProductPatchSchema,
  adminProductsQuerySchema,
  adminUserPatchSchema,
  adminUsersQuerySchema,
} from "./admin.schemas.js";
import {
  getAdminDashboard,
  getAdminUser,
  listAdminCampaigns,
  listAdminLogs,
  listAdminProducts,
  listAdminUsers,
  updateAdminProductStatus,
  updateAdminUser,
  writeAdminLog,
} from "./admin.service.js";

export async function adminDashboardController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await getAdminDashboard());
  } catch (error) {
    next(error);
  }
}

export async function adminUsersController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = adminUsersQuerySchema.parse(req.query);
    return sendSuccess(res, await listAdminUsers(query));
  } catch (error) {
    next(error);
  }
}

export async function adminUserGetController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await getAdminUser(routeId(req)));
  } catch (error) {
    next(error);
  }
}

export async function adminUserPatchController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = adminUserPatchSchema.parse(req.body);
    return sendSuccess(res, await updateAdminUser(req.user!, routeId(req), input));
  } catch (error) {
    next(error);
  }
}

export async function adminProductsController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = adminProductsQuerySchema.parse(req.query);
    return sendSuccess(res, await listAdminProducts(query));
  } catch (error) {
    next(error);
  }
}

export async function adminProductPatchController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = adminProductPatchSchema.parse(req.body);
    return sendSuccess(res, await updateAdminProductStatus(req.user!, routeId(req), input.status));
  } catch (error) {
    next(error);
  }
}

export async function adminCampaignsController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = adminCampaignsQuerySchema.parse(req.query);
    return sendSuccess(res, await listAdminCampaigns(query));
  } catch (error) {
    next(error);
  }
}

export async function adminLogsController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = adminLogsQuerySchema.parse(req.query);
    return sendSuccess(res, await listAdminLogs(query));
  } catch (error) {
    next(error);
  }
}

export async function recordAdminLogin(userId: string) {
  await writeAdminLog({ adminUserId: userId, action: "ADMIN_LOGIN" });
}
