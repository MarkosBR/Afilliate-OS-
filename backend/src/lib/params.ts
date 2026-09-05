import type { Request } from "express";
import { AppError } from "../middleware/errorHandler.js";

export function routeId(req: Request, key = "id"): string {
  const value = req.params[key];
  if (typeof value !== "string" || !value) {
    throw new AppError(400, "INVALID_ID", "Invalid identifier.");
  }
  return value;
}
