import { z } from "zod";

export const publicationPlatformSchema = z.enum(["INSTAGRAM", "TIKTOK", "YOUTUBE", "FACEBOOK", "OTHER"]);
export const publicationStatusSchema = z.enum(["PENDING", "SCHEDULED", "READY", "PUBLISHED", "FAILED", "CANCELLED"]);

const dateTimeSchema = z.string().trim().min(1).refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date.");

export const scheduleSchema = z.object({
  platform: publicationPlatformSchema,
  scheduledAt: dateTimeSchema,
});

export const calendarQuerySchema = z
  .object({
    from: dateTimeSchema.optional(),
    to: dateTimeSchema.optional(),
    status: publicationStatusSchema.optional(),
    platform: publicationPlatformSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.from && data.to && new Date(data.from).getTime() > new Date(data.to).getTime()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "from must be before to." });
    }
  });
