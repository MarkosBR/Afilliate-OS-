import { z } from "zod";
import { contentKindSchema } from "../ai/ai.schemas.js";

export const contentSchema = z.object({
  productId: z.string().min(1).optional().nullable(),
  campaignId: z.string().min(1).optional().nullable(),
  linkId: z.string().min(1).optional().nullable(),
  title: z.string().trim().min(2).max(180),
  body: z.string().trim().max(8000).optional().nullable(),
  kind: contentKindSchema.optional().default("POST"),
  channel: z.string().trim().max(80).optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional().default("DRAFT"),
  source: z.enum(["MANUAL", "AI"]).optional().default("MANUAL"),
  generatedBy: z.string().trim().max(80).optional().nullable(),
});

export const contentUpdateSchema = contentSchema.partial();
