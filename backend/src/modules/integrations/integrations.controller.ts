import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../lib/http.js";
import { routeId } from "../../lib/params.js";
import { integrationPlatformSchema } from "./integrations.schemas.js";
import {
  connectPlatform,
  disconnectIntegration,
  getIntegration,
  getIntegrationStatus,
  listIntegrations,
} from "./integrations.service.js";

export async function listIntegrationsController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await listIntegrations(req.user!.id));
  } catch (error) {
    next(error);
  }
}

export async function getIntegrationController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await getIntegration(req.user!.id, routeId(req)));
  } catch (error) {
    next(error);
  }
}

export async function connectPlatformController(req: Request, res: Response, next: NextFunction) {
  try {
    const platform = integrationPlatformSchema.parse(req.params.platform);
    return sendSuccess(res, await connectPlatform(req.user!.id, platform));
  } catch (error) {
    next(error);
  }
}

export async function disconnectIntegrationController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await disconnectIntegration(req.user!.id, routeId(req)));
  } catch (error) {
    next(error);
  }
}

export async function integrationStatusController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await getIntegrationStatus(req.user!.id, routeId(req)));
  } catch (error) {
    next(error);
  }
}
