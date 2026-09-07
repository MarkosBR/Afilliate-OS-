import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../lib/http.js";
import { routeId } from "../../lib/params.js";
import { listNotifications, markNotificationRead } from "./notifications.service.js";

export async function listNotificationsController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await listNotifications(req.user!.id));
  } catch (error) {
    next(error);
  }
}

export async function markNotificationReadController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await markNotificationRead(req.user!.id, routeId(req)));
  } catch (error) {
    next(error);
  }
}
