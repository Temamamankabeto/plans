export type LivestockProductInput = {
  name?: string;
  is_active?: boolean | number | string;
};

export type LivestockProductValidationResult =
  | {
      valid: true;
      data: {
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

export function validateLivestockProductInput(input: LivestockProductInput): LivestockProductValidationResult {
  const name = String(input.name ?? "").trim();
  const errors: Record<string, string> = {};

  if (!name) {
    errors.name = "Livestock Product name is required";
  } else if (name.length < 2) {
    errors.name = "Livestock Product name must be at least 2 characters";
  } else if (name.length > 191) {
    errors.name = "Livestock Product name may not be greater than 191 characters";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, data: null, errors };
  }

  return {
    valid: true,
    data: {
      name,
      is_active: normalizeActive(input.is_active ?? true),
    },
    errors: {},
  };
}
