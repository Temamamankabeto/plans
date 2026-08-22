import { z } from "zod";

const nullableNumber = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null || value === "none") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}, z.number().int().positive().nullable().optional());

export const userRoles = [
  "Super Admin",
  "Head of Office",
  "Deputy Head of Office",
  "Manager",
  "Adviser",
  "Director",
  "Team Leader",
  "Expert",
] as const;

const common = {
  name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().email("Valid email is required").max(100),
  phone: z.string().trim().min(6, "Phone is required").max(20),
  role: z.enum(userRoles, { message: "Role is required" }),
  status: z.enum(["active", "disabled"]).optional(),
  office_id: nullableNumber,
  directorate_id: nullableNumber,
  department_id: nullableNumber,
  team_id: nullableNumber,
  professional_level: z.string().trim().max(80).nullable().optional(),
  signature: z.any().nullable().optional(),
  stamp: z.any().nullable().optional(),
  titer: z.any().nullable().optional(),
};

function validateScope(value: { role?: string; office_id?: number | null; directorate_id?: number | null; department_id?: number | null; team_id?: number | null }, ctx: z.RefinementCtx) {
  if (!value.office_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["office_id"], message: "Office is required" });
  }

  if (["Manager", "Adviser", "Director", "Team Leader", "Expert"].includes(value.role ?? "") && !value.directorate_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["directorate_id"], message: "Directorate is required for this role" });
  }

  if (["Manager", "Adviser"].includes(value.role ?? "") && !value.department_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["department_id"], message: "Department is required for Manager and Adviser" });
  }

  if (value.role === "Team Leader" && !value.team_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["team_id"], message: "Team is required for Team Leader" });
  }
}

export const createUserSchema = z
  .object({
    ...common,
    password: z.string().min(8, "Password must be at least 8 characters").max(255),
  })
  .superRefine(validateScope);

export const updateUserSchema = z.object(common).superRefine(validateScope);
