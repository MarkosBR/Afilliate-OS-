import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../lib/http.js";
import { generateSchema } from "./ai.schemas.js";
import { generateForUser, readAiStatus } from "./ai.service.js";

export async function aiStatusController(_req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, readAiStatus());
  } catch (error) {
    next(error);
  }
}

export async function generateController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = generateSchema.parse(req.body);
    const result = await generateForUser(req.user!.id, input);
    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
