import { z } from "zod";

export const integrationPlatformSchema = z.enum([
  "INSTAGRAM",
  "FACEBOOK",
  "TIKTOK",
  "YOUTUBE",
  "WHATSAPP",
  "TELEGRAM",
]);
