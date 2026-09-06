import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { sendSuccess } from "../../lib/http.js";
import { getAnalyticsBreakdown, getAnalyticsSummary, getDashboardOverview } from "./analytics.service.js";

const overviewQuerySchema = z.object({
  days: z.coerce.number().int().optional(),
});

export async function analyticsSummaryController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await getAnalyticsSummary(req.user!.id));
  } catch (error) {
    next(error);
  }
}

export async function analyticsOverviewController(req: Request, res: Response, next: NextFunction) {
  try {
    const { days } = overviewQuerySchema.parse(req.query);
    return sendSuccess(res, await getDashboardOverview(req.user!.id, days));
  } catch (error) {
    next(error);
  }
}

export async function analyticsBreakdownController(req: Request, res: Response, next: NextFunction) {
  try {
    const { days } = overviewQuerySchema.parse(req.query);
    return sendSuccess(res, await getAnalyticsBreakdown(req.user!.id, days));
  } catch (error) {
    next(error);
  }
}
