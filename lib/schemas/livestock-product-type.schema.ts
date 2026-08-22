export type LivestockProductTypeInput = {
  livestock_product_id?: string | number;
  name?: string;
  number_unit?: string;
  productivity_unit?: string;
  production_unit?: string;
  is_active?: boolean | number | string;
};

export type LivestockProductTypeValidationResult =
  | {
      valid: true;
      data: {
        livestock_product_id: number;
        name: string;
        number_unit: string;
        productivity_unit: string;
        production_unit: string;
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

function cleanUnit(value: unknown, fallback: string) {
  const unit = String(value ?? "").trim();
  return unit || fallback;
}

function validateUnit(value: string, label: string, errors: Record<string, string>) {
  if (value.length > 80) errors[label] = "Unit may not be greater than 80 characters";
}

export function validateLivestockProductTypeInput(input: LivestockProductTypeInput): LivestockProductTypeValidationResult {
  const livestockProductId = Number(input.livestock_product_id);
  const name = String(input.name ?? "").trim();
  const numberUnit = cleanUnit(input.number_unit, "Head");
  const productivityUnit = cleanUnit(input.productivity_unit, "Unit/Head");
  const productionUnit = cleanUnit(input.production_unit, "Unit");
  const errors: Record<string, string> = {};

  if (!livestockProductId || Number.isNaN(livestockProductId)) {
    errors.livestock_product_id = "Livestock Product Type is required";
  }

  if (!name) {
    errors.name = "Livestock Product Type name is required";
  } else if (name.length < 2) {
    errors.name = "Livestock Product Type name must be at least 2 characters";
  } else if (name.length > 191) {
    errors.name = "Livestock Product Type name may not be greater than 191 characters";
  }

  validateUnit(numberUnit, "number_unit", errors);
  validateUnit(productivityUnit, "productivity_unit", errors);
  validateUnit(productionUnit, "production_unit", errors);

  if (Object.keys(errors).length > 0) {
    return { valid: false, data: null, errors };
  }

  return {
    valid: true,
    data: {
      livestock_product_id: livestockProductId,
      name,
      number_unit: numberUnit,
      productivity_unit: productivityUnit,
      production_unit: productionUnit,
      is_active: normalizeActive(input.is_active ?? true),
    },
    errors: {},
  };
}
