import { z } from "zod";

export const contentKindSchema = z.enum(["POST", "CAPTION", "AD", "PRODUCT_DESCRIPTION", "SCRIPT", "VIDEO"]);
export const contentToneSchema = z.enum(["professional", "casual", "persuasive", "urgent", "friendly"]);

export const generateSchema = z.object({
  productId: z.string().min(1),
  campaignId: z.string().min(1).optional().nullable(),
  kind: contentKindSchema,
  tone: contentToneSchema.optional().default("professional"),
  extraContext: z.string().trim().max(1000).optional().nullable(),
});
