import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../lib/http.js";
import { getAnalyticsSummary } from "./analytics.service.js";

export async function analyticsSummaryController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await getAnalyticsSummary(req.user!.id));
  } catch (error) {
    next(error);
  }
}
