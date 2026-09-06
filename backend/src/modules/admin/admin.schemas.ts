import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
  q: z.string().trim().max(120).optional(),
});

export const adminUsersQuerySchema = paginationSchema.extend({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"]).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
});

export const adminUserPatchSchema = z
  .object({
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
    role: z.enum(["USER", "ADMIN"]).optional(),
  })
  .refine((data) => data.status || data.role, { message: "Provide status or role." });

export const adminProductsQuerySchema = paginationSchema.extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const adminProductPatchSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const adminCampaignsQuerySchema = paginationSchema.extend({
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]).optional(),
});

export const adminLogsQuerySchema = paginationSchema.extend({
  action: z.string().trim().max(80).optional(),
});
