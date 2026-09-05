import type { NextFunction, Request, Response } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const started = Date.now();
  res.on("finish", () => {
    if (process.env.NODE_ENV === "test") return;
    const duration = Date.now() - started;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
}
