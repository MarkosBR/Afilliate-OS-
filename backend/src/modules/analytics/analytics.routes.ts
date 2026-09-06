import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  analyticsBreakdownController,
  analyticsCampaignController,
  analyticsLinkController,
  analyticsOverviewController,
  analyticsReportController,
  analyticsSummaryController,
} from "./analytics.controller.js";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);
analyticsRouter.get("/summary", analyticsSummaryController);
analyticsRouter.get("/overview", analyticsOverviewController);
analyticsRouter.get("/breakdown", analyticsBreakdownController);
analyticsRouter.get("/report", analyticsReportController);
analyticsRouter.get("/links/:linkId", analyticsLinkController);
analyticsRouter.get("/campaigns/:campaignId", analyticsCampaignController);
analyticsRouter.get("/", analyticsSummaryController);
