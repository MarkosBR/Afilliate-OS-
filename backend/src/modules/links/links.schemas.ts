import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug.");

export const linkSchema = z.object({
  productId: z.string().min(1),
  campaignId: z.string().min(1).nullable().optional(),
  name: z.string().trim().min(2).max(120),
  url: z.string().trim().url().max(500).optional(),
  slug: slugSchema.optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const linkUpdateSchema = z.object({
  productId: z.string().min(1).optional(),
  campaignId: z.string().min(1).nullable().optional(),
  name: z.string().trim().min(2).max(120).optional(),
  url: z.string().trim().url().max(500).optional(),
  slug: slugSchema.optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});
