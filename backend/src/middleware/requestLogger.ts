import type { NextFunction, Request, Response } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const started = Date.now();
  res.on("finish", () => {
    if (process.env.NODE_ENV === "test") return;
    const duration = Date.now() - started;
    const path = req.originalUrl.split("?")[0];
    const safeUrl =
      path.includes("/integrations/youtube/callback") ||
      path.includes("/integrations/youtube/connect") ||
      path.includes("/integrations/tiktok/callback") ||
      path.includes("/integrations/tiktok/connect")
        ? path
        : req.originalUrl;
    console.log(`${req.method} ${safeUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
}
