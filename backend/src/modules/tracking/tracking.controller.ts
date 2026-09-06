import type { NextFunction, Request, Response } from "express";
import { sendError } from "../../lib/http.js";
import { routeId } from "../../lib/params.js";
import { resolveTrackedLink } from "./tracking.service.js";

export async function goController(req: Request, res: Response, next: NextFunction) {
  try {
    const slug = routeId(req, "slug");
    const target = await resolveTrackedLink(req, slug);
    if (!target) {
      return sendError(res, 404, "NOT_FOUND", "Link not found.");
    }
    return res.redirect(302, target);
  } catch (error) {
    next(error);
  }
}
