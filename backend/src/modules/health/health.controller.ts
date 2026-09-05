import type { Request, Response, NextFunction } from "express";
import { getHealth } from "./health.service.js";

export async function healthController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const payload = await getHealth();
    const httpStatus = payload.database === "connected" ? 200 : 503;
    return res.status(httpStatus).json(payload);
  } catch (error) {
    next(error);
  }
}
