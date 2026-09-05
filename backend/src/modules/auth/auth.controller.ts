import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../lib/http.js";
import { serializeUser } from "../../lib/serializers.js";
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "./auth.schemas.js";
import {
  changePassword,
  clearSessionCookie,
  loginUser,
  registerUser,
  sessionCookie,
  updateProfile,
} from "./auth.service.js";

export async function registerController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerSchema.parse(req.body);
    const payload = await registerUser(input);
    res.setHeader("Set-Cookie", sessionCookie(payload.token));
    return sendSuccess(res, payload, 201);
  } catch (error) {
    next(error);
  }
}

export async function loginController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body);
    const payload = await loginUser(input);
    res.setHeader("Set-Cookie", sessionCookie(payload.token));
    return sendSuccess(res, payload);
  } catch (error) {
    next(error);
  }
}

export function logoutController(_req: Request, res: Response) {
  res.setHeader("Set-Cookie", clearSessionCookie());
  return sendSuccess(res, { ok: true });
}

export function meController(req: Request, res: Response) {
  return sendSuccess(res, serializeUser(req.user!));
}

export async function updateProfileController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateProfileSchema.parse(req.body);
    const user = await updateProfile(req.user!, input);
    return sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}

export async function changePasswordController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = changePasswordSchema.parse(req.body);
    await changePassword(req.user!, input);
    return sendSuccess(res, { ok: true });
  } catch (error) {
    next(error);
  }
}
