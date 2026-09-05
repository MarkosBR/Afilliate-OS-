import { z } from "zod";

export const linkSchema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  url: z.string().trim().url().max(500).optional(),
});

export const linkUpdateSchema = z.object({
  productId: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  url: z.string().trim().url().max(500).optional(),
});
