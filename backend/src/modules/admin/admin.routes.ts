import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middleware/auth.js";
import {
  adminCampaignsController,
  adminDashboardController,
  adminLogsController,
  adminProductPatchController,
  adminProductsController,
  adminUserGetController,
  adminUserPatchController,
  adminUsersController,
} from "./admin.controller.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);
adminRouter.get("/dashboard", adminDashboardController);
adminRouter.get("/users", adminUsersController);
adminRouter.get("/users/:id", adminUserGetController);
adminRouter.patch("/users/:id", adminUserPatchController);
adminRouter.get("/products", adminProductsController);
adminRouter.patch("/products/:id", adminProductPatchController);
adminRouter.get("/campaigns", adminCampaignsController);
adminRouter.get("/logs", adminLogsController);
