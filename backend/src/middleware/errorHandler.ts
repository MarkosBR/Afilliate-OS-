import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { sendError } from "../lib/http.js";

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFoundHandler(_req: Request, res: Response) {
  return sendError(res, 404, "NOT_FOUND", "Route not found.");
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return sendError(res, err.status, err.code, err.message);
  }

  if (err instanceof ZodError) {
    return sendError(res, 400, "VALIDATION_ERROR", "Invalid request payload.");
  }

  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error."
      : err instanceof Error
        ? err.message
        : "Unknown error.";

  return sendError(res, 500, "INTERNAL_ERROR", message);
}
