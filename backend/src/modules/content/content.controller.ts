import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../lib/http.js";
import { routeId } from "../../lib/params.js";
import { contentSchema, contentUpdateSchema } from "./content.schemas.js";
import {
  approveContent,
  attachContentVideo,
  createContent,
  deleteContent,
  getContent,
  listContents,
  rejectContent,
  updateContent,
} from "./content.service.js";
import { readMultipartVideo } from "../../lib/multipart.js";

export async function listContentsController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await listContents(req.user!.id));
  } catch (error) {
    next(error);
  }
}

export async function getContentController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await getContent(req.user!.id, routeId(req)));
  } catch (error) {
    next(error);
  }
}

export async function createContentController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = contentSchema.parse(req.body);
    return sendSuccess(res, await createContent(req.user!.id, input), 201);
  } catch (error) {
    next(error);
  }
}

export async function updateContentController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = contentUpdateSchema.parse(req.body);
    return sendSuccess(res, await updateContent(req.user!.id, routeId(req), input));
  } catch (error) {
    next(error);
  }
}

export async function deleteContentController(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteContent(req.user!.id, routeId(req));
    return sendSuccess(res, { ok: true });
  } catch (error) {
    next(error);
  }
}

export async function approveContentController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await approveContent(req.user!.id, routeId(req)));
  } catch (error) {
    next(error);
  }
}

export async function rejectContentController(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await rejectContent(req.user!.id, routeId(req)));
  } catch (error) {
    next(error);
  }
}

export async function uploadContentVideoController(req: Request, res: Response, next: NextFunction) {
  try {
    const file = await readMultipartVideo(req);
    return sendSuccess(res, await attachContentVideo(req.user!.id, routeId(req), file));
  } catch (error) {
    next(error);
  }
}
