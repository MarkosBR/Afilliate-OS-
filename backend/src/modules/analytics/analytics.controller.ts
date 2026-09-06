import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../lib/http.js";
import { routeId } from "../../lib/params.js";
import { analyticsQuerySchema } from "./analytics.schemas.js";
import {
  getAnalyticsBreakdown,
  getAnalyticsSummary,
  getCampaignAnalytics,
  getDashboardOverview,
  getFilteredAnalytics,
  getLinkAnalytics,
} from "./analytics.service.js";

export async function analyticsSummaryController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await getAnalyticsSummary(req.user!.id));
  } catch (error) {
    next(error);
  }
}

export async function analyticsOverviewController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = analyticsQuerySchema.parse(req.query);
    const days = query.range === "30d" ? 30 : query.range === "14d" ? 14 : query.days ?? 7;
    return sendSuccess(res, await getDashboardOverview(req.user!.id, days));
  } catch (error) {
    next(error);
  }
}

export async function analyticsBreakdownController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = analyticsQuerySchema.parse(req.query);
    const days = query.range === "30d" ? 30 : query.range === "14d" ? 14 : query.days ?? 7;
    return sendSuccess(res, await getAnalyticsBreakdown(req.user!.id, days));
  } catch (error) {
    next(error);
  }
}

export async function analyticsReportController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = analyticsQuerySchema.parse(req.query);
    return sendSuccess(res, await getFilteredAnalytics(req.user!.id, query));
  } catch (error) {
    next(error);
  }
}

export async function analyticsLinkController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = analyticsQuerySchema.parse(req.query);
    return sendSuccess(res, await getLinkAnalytics(req.user!.id, routeId(req, "linkId"), query));
  } catch (error) {
    next(error);
  }
}

export async function analyticsCampaignController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = analyticsQuerySchema.parse(req.query);
    return sendSuccess(res, await getCampaignAnalytics(req.user!.id, routeId(req, "campaignId"), query));
  } catch (error) {
    next(error);
  }
}
