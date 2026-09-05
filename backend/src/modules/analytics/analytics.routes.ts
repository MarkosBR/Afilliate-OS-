import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { analyticsSummaryController } from "./analytics.controller.js";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);
analyticsRouter.get("/summary", analyticsSummaryController);
analyticsRouter.get("/", analyticsSummaryController);
