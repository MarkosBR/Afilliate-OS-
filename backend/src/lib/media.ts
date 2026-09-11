import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { AppError } from "../middleware/errorHandler.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const UPLOADS_DIR = join(rootDir, "uploads", "videos");

const ALLOWED_EXT = new Set([".mp4", ".mov", ".mpeg", ".webm", ".avi"]);

export function resolveOwnedVideoPath(userId: string, storedPath: string) {
  const absolute = storedPath.startsWith("/") ? storedPath : join(UPLOADS_DIR, storedPath);
  const normalized = resolve(absolute);
  const ownedRoot = resolve(join(UPLOADS_DIR, userId));
  if (!normalized.startsWith(ownedRoot + "/") && normalized !== ownedRoot) {
    throw new AppError(400, "VIDEO_REQUIRED", "Video file is not available.");
  }
  return normalized;
}

export async function saveUserVideo(userId: string, fileName: string, buffer: Buffer) {
  const ext = extname(fileName).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new AppError(400, "VIDEO_REQUIRED", "A valid video file is required.");
  }
  if (!buffer.length) {
    throw new AppError(400, "VIDEO_REQUIRED", "A valid video file is required.");
  }
  const dir = join(UPLOADS_DIR, userId);
  await mkdir(dir, { recursive: true });
  const storedName = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
  const absolute = join(dir, storedName);
  await writeFile(absolute, buffer);
  return { absolute, storedName, originalName: fileName };
}

export async function removeUserVideo(userId: string, storedPath: string | null | undefined) {
  if (!storedPath) return;
  try {
    const absolute = resolveOwnedVideoPath(userId, storedPath);
    await unlink(absolute);
  } catch {
    return;
  }
}
