import { z } from "zod";

export const departmentSchema = z.object({
  office_id: z.coerce.number().int().positive("Office is required"),
  name: z.string().trim().min(2, "Department name is required").max(191),
  code: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  is_active: z.boolean().default(true),
});

export type DepartmentSchema = z.infer<typeof departmentSchema>;
