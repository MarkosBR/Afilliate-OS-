import { z } from "zod";

export const campaignSchema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  budget: z.coerce.number().min(0).max(1_000_000),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]).optional().default("DRAFT"),
});

export const campaignUpdateSchema = campaignSchema.partial();
