export type TeamInput = {
  directorate_id?: string | number;
  name?: string;
  is_active?: boolean | number | string;
};

export type TeamValidationResult =
  | {
      valid: true;
      data: {
        directorate_id: number;
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

export function validateTeamInput(input: TeamInput): TeamValidationResult {
  const directorateId = Number(input.directorate_id);
  const name = String(input.name ?? "").trim();
  const errors: Record<string, string> = {};

  if (!directorateId || Number.isNaN(directorateId)) {
    errors.directorate_id = "Directorate is required";
  }

  if (!name) {
    errors.name = "Team name is required";
  } else if (name.length < 2) {
    errors.name = "Team name must be at least 2 characters";
  } else if (name.length > 191) {
    errors.name = "Team name may not be greater than 191 characters";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, data: null, errors };
  }

  return {
    valid: true,
    data: {
      directorate_id: directorateId,
      name,
      is_active: normalizeActive(input.is_active ?? true),
    },
    errors: {},
  };
}
