import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../lib/http.js";
import { routeId } from "../../lib/params.js";
import { createLink, deleteLink, getLink, getLinkStats, listLinks, updateLink } from "./links.service.js";
import { linkSchema, linkUpdateSchema } from "./links.schemas.js";

export async function listLinksController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await listLinks(req.user!.id));
  } catch (error) {
    next(error);
  }
}

export async function getLinkController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await getLink(req.user!.id, routeId(req)));
  } catch (error) {
    next(error);
  }
}

export async function getLinkStatsController(req: Request, res: Response, next: NextFunction) {
  try {
    const days = Number(req.query.days ?? 7);
    return sendSuccess(res, await getLinkStats(req.user!.id, routeId(req), days));
  } catch (error) {
    next(error);
  }
}

export async function createLinkController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = linkSchema.parse(req.body);
    return sendSuccess(res, await createLink(req.user!.id, input), 201);
  } catch (error) {
    next(error);
  }
}

export async function updateLinkController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = linkUpdateSchema.parse(req.body);
    return sendSuccess(res, await updateLink(req.user!.id, routeId(req), input));
  } catch (error) {
    next(error);
  }
}

export async function deleteLinkController(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteLink(req.user!.id, routeId(req));
    return sendSuccess(res, { ok: true });
  } catch (error) {
    next(error);
  }
}
