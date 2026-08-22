export type DirectorateFormInput = {
  office_id: number | string;
  department_id: number | string;
  name: string;
  is_active: boolean;
};

export function validateDirectorateInput(input: DirectorateFormInput) {
  const errors: Record<string, string> = {};
  const officeId = Number(input.office_id);
  const departmentId = Number(input.department_id);
  const name = String(input.name ?? "").trim();

  if (!officeId) errors.office_id = "Office is required";
  if (!departmentId) errors.department_id = "Department is required";
  if (!name) errors.name = "Directorate name is required";
  if (name.length > 191) errors.name = "Directorate name must be 191 characters or less";

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: {
      office_id: officeId,
      department_id: departmentId,
      name,
      is_active: Boolean(input.is_active),
    },
  };
}
