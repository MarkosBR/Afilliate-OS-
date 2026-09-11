import type { Request } from "express";
import { AppError } from "../middleware/errorHandler.js";

export async function readMultipartVideo(req: Request) {
  const contentType = req.headers["content-type"] ?? "";
  const match = contentType.match(/multipart\/form-data;\s*boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) {
    throw new AppError(400, "VIDEO_REQUIRED", "A valid video file is required.");
  }
  const boundary = match[1] ?? match[2];
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks);
  if (raw.length > 100 * 1024 * 1024) {
    throw new AppError(400, "VIDEO_REQUIRED", "A valid video file is required.");
  }
  const parts = raw.toString("binary").split(`--${boundary}`);
  for (const part of parts) {
    if (!part.includes("filename=")) continue;
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd < 0) continue;
    const headers = part.slice(0, headerEnd);
    const nameMatch = headers.match(/filename="([^"]+)"/i);
    const mimeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
    let body = part.slice(headerEnd + 4);
    if (body.endsWith("\r\n")) body = body.slice(0, -2);
    const buffer = Buffer.from(body, "binary");
    return {
      filename: nameMatch?.[1] || "video.mp4",
      mime: mimeMatch?.[1]?.trim() || "video/mp4",
      buffer,
    };
  }
  throw new AppError(400, "VIDEO_REQUIRED", "A valid video file is required.");
}
