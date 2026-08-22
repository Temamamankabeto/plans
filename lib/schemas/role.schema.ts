import { z } from "zod";

export const planAchievementRoles = [
  "Super Admin",
  "Head of Office",
  "Deputy Head of Office",
  "Manager",
  "Adviser",
  "Director",
  "Team Leader",
  "Expert",
] as const;

export const roleSchema = z.object({
  name: z.enum(planAchievementRoles),
  description: z.string().max(500).optional().nullable(),
});

export type RoleSchema = z.infer<typeof roleSchema>;
