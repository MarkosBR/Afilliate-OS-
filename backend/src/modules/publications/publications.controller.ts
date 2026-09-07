import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../lib/http.js";
import { routeId } from "../../lib/params.js";
import { calendarQuerySchema, scheduleSchema } from "./publications.schemas.js";
import {
  cancelPublication,
  getPublication,
  listCalendar,
  listPublications,
  scheduleContent,
} from "./publications.service.js";

export async function listPublicationsController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await listPublications(req.user!.id));
  } catch (error) {
    next(error);
  }
}

export async function getPublicationController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await getPublication(req.user!.id, routeId(req)));
  } catch (error) {
    next(error);
  }
}

export async function scheduleContentController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = scheduleSchema.parse(req.body);
    return sendSuccess(res, await scheduleContent(req.user!.id, routeId(req), input), 201);
  } catch (error) {
    next(error);
  }
}

export async function cancelPublicationController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await cancelPublication(req.user!.id, routeId(req)));
  } catch (error) {
    next(error);
  }
}

export async function calendarController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = calendarQuerySchema.parse(req.query);
    return sendSuccess(res, await listCalendar(req.user!.id, query));
  } catch (error) {
    next(error);
  }
}
