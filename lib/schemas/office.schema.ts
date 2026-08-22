import { z } from "zod";
import type { OfficePayload } from "@/types/location/office.type";

const parentId = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null || value === "none") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}, z.number().int().positive().nullable().optional());

const boolish = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return true;
  if (value === true || value === 1 || value === "1" || value === "true" || value === "active") return true;
  if (value === false || value === 0 || value === "0" || value === "false" || value === "inactive") return false;
  return value;
}, z.boolean());

export const officeSchema = z.object({
  name: z.string().trim().min(2, "Office name is required").max(191, "Office name must not exceed 191 characters"),
  code: z.string().trim().max(80, "Code must not exceed 80 characters").optional().nullable().or(z.literal("")),
  type: z.enum(["office", "bureau", "agency", "directorate", "president_office"]).optional().default("office"),
  parent_id: parentId,
  description: z.string().trim().max(1000, "Description must not exceed 1000 characters").optional().nullable().or(z.literal("")),
  is_active: boolish.default(true),
});

export const parseOfficePayload = (value: unknown): OfficePayload => {
  const parsed = officeSchema.parse(value);

  return {
    name: parsed.name,
    code: parsed.code || null,
    type: parsed.type || "office",
    parent_id: parsed.parent_id ?? null,
    description: parsed.description || null,
    is_active: parsed.is_active,
  };
};
