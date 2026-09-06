import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { analyticsOverviewController, analyticsSummaryController } from "./analytics.controller.js";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);
analyticsRouter.get("/summary", analyticsSummaryController);
analyticsRouter.get("/overview", analyticsOverviewController);
analyticsRouter.get("/", analyticsSummaryController);
