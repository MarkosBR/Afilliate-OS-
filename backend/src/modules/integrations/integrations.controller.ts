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
import { completeYouTubeCallback, integrationsFrontendRedirect, startYouTubeConnect } from "./youtube.service.js";
import { AppError } from "../../middleware/errorHandler.js";

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

export async function youtubeConnectController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await startYouTubeConnect(req.user!.id);
    if (req.headers.accept?.includes("application/json") || req.query.json === "1") {
      return sendSuccess(res, result);
    }
    return res.redirect(result.authorizationUrl);
  } catch (error) {
    next(error);
  }
}

export async function youtubeCallbackController(req: Request, res: Response, next: NextFunction) {
  const wantsJson = req.headers.accept?.includes("application/json") || req.query.json === "1";
  try {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    const error = typeof req.query.error === "string" ? req.query.error : null;
    const result = await completeYouTubeCallback({ code, state, error });
    if (wantsJson) return sendSuccess(res, result.account);
    return res.redirect(integrationsFrontendRedirect());
  } catch (error) {
    const code = error instanceof AppError ? error.code : "OAUTH_CALLBACK_FAILED";
    if (wantsJson) {
      next(error);
      return;
    }
    return res.redirect(integrationsFrontendRedirect(code));
  }
}
