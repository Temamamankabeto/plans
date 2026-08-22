export type WorkInput = {
  work_type_id?: string | number;
  name?: string;
  is_active?: boolean | number | string;
};

export type WorkValidationResult =
  | {
      valid: true;
      data: {
        work_type_id: number;
        name: string;
        is_active: boolean;
      };
      errors: Record<string, never>;
    }
  | {
      valid: false;
      data: null;
      errors: Record<string, string>;
    };

function normalizeActive(value: unknown) {
  return !(value === "inactive" || value === false || value === 0 || value === "0" || value === "false");
}

export function validateWorkInput(input: WorkInput): WorkValidationResult {
  const workTypeId = Number(input.work_type_id);
  const name = String(input.name ?? "").trim();
  const errors: Record<string, string> = {};

  if (!workTypeId || Number.isNaN(workTypeId)) {
    errors.work_type_id = "Work type is required";
  }

  if (!name) {
    errors.name = "Work name is required";
  } else if (name.length < 2) {
    errors.name = "Work name must be at least 2 characters";
  } else if (name.length > 191) {
    errors.name = "Work name may not be greater than 191 characters";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, data: null, errors };
  }

  return {
    valid: true,
    data: {
      work_type_id: workTypeId,
      name,
      is_active: normalizeActive(input.is_active ?? true),
    },
    errors: {},
  };
}
