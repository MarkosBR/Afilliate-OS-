import { z } from "zod";

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date.")
  .optional();

export const analyticsQuerySchema = z
  .object({
    range: z.enum(["today", "7d", "14d", "30d", "custom"]).optional(),
    days: z.coerce.number().int().min(1).max(90).optional(),
    from: isoDate,
    to: isoDate,
    linkId: z.string().min(1).max(80).optional(),
    campaignId: z.string().min(1).max(80).optional(),
    utmSource: z.string().trim().max(80).optional(),
    utmMedium: z.string().trim().max(80).optional(),
    utmCampaign: z.string().trim().max(80).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.range === "custom" && (!data.from || !data.to)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Custom range requires from and to." });
    }
    if (data.from && data.to && data.from > data.to) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "from must be before to." });
    }
  });

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
