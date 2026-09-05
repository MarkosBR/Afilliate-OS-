import { z } from "zod";

export const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  platform: z.enum(["HOTMART", "EDUZZ", "KIWIFY", "OTHER"]),
  externalId: z.string().trim().max(120).optional().nullable(),
  affiliateUrl: z.string().trim().url().max(500),
  commission: z.coerce.number().min(0).max(100),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
});

export const productUpdateSchema = productSchema.partial();
