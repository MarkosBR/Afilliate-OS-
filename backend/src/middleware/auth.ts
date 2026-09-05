import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { verifySessionToken } from "../lib/token.js";
import { sendError } from "../lib/http.js";

const COOKIE_NAME = "affiliateos_session";

function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  const match = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.slice(COOKIE_NAME.length + 1)) : null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) {
    return sendError(res, 401, "UNAUTHENTICATED", "Authentication required.");
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    return sendError(res, 401, "UNAUTHENTICATED", "Invalid or expired session.");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.status !== "ACTIVE") {
    return sendError(res, 401, "UNAUTHENTICATED", "Account is not active.");
  }

  req.user = user;
  next();
}
