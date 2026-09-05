import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { createSessionToken } from "../../lib/token.js";
import { serializeUser } from "../../lib/serializers.js";
import type { User } from "@prisma/client";

const COOKIE_NAME = "affiliateos_session";

export function sessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${secure}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, "EMAIL_TAKEN", "Email already registered.");
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      lastLogin: new Date(),
    },
  });

  const token = createSessionToken(user.id);
  return { user: serializeUser(user), token };
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }
  if (user.status !== "ACTIVE") {
    throw new AppError(403, "ACCOUNT_INACTIVE", "Account is not active.");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const token = createSessionToken(updated.id);
  return { user: serializeUser(updated), token };
}

export async function updateProfile(user: User, input: {
  name?: string;
  email?: string;
  avatar?: string | null;
}) {
  if (input.email && input.email !== user.email) {
    const taken = await prisma.user.findUnique({ where: { email: input.email } });
    if (taken) {
      throw new AppError(409, "EMAIL_TAKEN", "Email already registered.");
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: input.name ?? user.name,
      email: input.email ?? user.email,
      avatar: input.avatar === undefined ? user.avatar : input.avatar,
    },
  });

  return serializeUser(updated);
}

export async function changePassword(
  user: User,
  input: { currentPassword: string; password: string },
) {
  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw new AppError(400, "INVALID_PASSWORD", "Current password is incorrect.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(input.password) },
  });
}
