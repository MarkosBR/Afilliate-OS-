import { Router } from "express";
import type { Request, Response } from "express";

function notImplemented(moduleName: string) {
  return (_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: `${moduleName} is not implemented in Phase 00. Foundation only.`,
      },
    });
  };
}

export function createPlaceholderRouter(moduleName: string) {
  const router = Router();
  router.use(notImplemented(moduleName));
  return router;
}
