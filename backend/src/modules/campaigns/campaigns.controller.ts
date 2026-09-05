import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../lib/http.js";
import { routeId } from "../../lib/params.js";
import {
  createCampaign,
  deleteCampaign,
  getCampaign,
  listCampaigns,
  updateCampaign,
} from "./campaigns.service.js";
import { campaignSchema, campaignUpdateSchema } from "./campaigns.schemas.js";

export async function listCampaignsController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await listCampaigns(req.user!.id));
  } catch (error) {
    next(error);
  }
}

export async function getCampaignController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await getCampaign(req.user!.id, routeId(req)));
  } catch (error) {
    next(error);
  }
}

export async function createCampaignController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = campaignSchema.parse(req.body);
    return sendSuccess(res, await createCampaign(req.user!.id, input), 201);
  } catch (error) {
    next(error);
  }
}

export async function updateCampaignController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = campaignUpdateSchema.parse(req.body);
    return sendSuccess(res, await updateCampaign(req.user!.id, routeId(req), input));
  } catch (error) {
    next(error);
  }
}

export async function deleteCampaignController(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteCampaign(req.user!.id, routeId(req));
    return sendSuccess(res, { ok: true });
  } catch (error) {
    next(error);
  }
}
