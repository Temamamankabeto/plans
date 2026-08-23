import { NextRequest } from "next/server";
import { execute, query, transaction } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/response";
import { readJson } from "@/lib/server/crud";

const userSelect = `
  SELECT
    u.id,
    u.name,
    u.email,
    u.phone,
    u.status,
    u.office_id,
    u.directorate_id,
    u.department_id,
    u.team_id,
    u.professional_level,
    u.signature_url,
    u.stamp_url,
    u.titer_url,
    u.last_login_at,
    u.created_at,
    u.updated_at,
    o.name AS office_name,
    d.name AS directorate_name,
    dp.name AS department_name,
    t.name AS team_name,
    GROUP_CONCAT(r.name ORDER BY r.name SEPARATOR ',') AS role_names
  FROM users u
  LEFT JOIN offices o ON o.id = u.office_id
  LEFT JOIN directorates d ON d.id = u.directorate_id
  LEFT JOIN departments dp ON dp.id = u.department_id
  LEFT JOIN teams t ON t.id = u.team_id
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.id = ur.role_id
`;

const groupBy = `
  GROUP BY
    u.id,
    u.name,
    u.email,
    u.phone,
    u.status,
    u.office_id,
    u.directorate_id,
    u.department_id,
    u.team_id,
    u.professional_level,
    u.signature_url,
    u.stamp_url,
    u.titer_url,
    u.last_login_at,
    u.created_at,
    u.updated_at,
    o.name,
    d.name,
    dp.name,
    t.name
`;

function normalizeId(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeRole(value: unknown) {
  return String(value ?? "").trim();
}

function formatUser(user: any) {
  const roles = String(user.role_names || "")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);

  return {
    ...user,
    role: roles[0] ?? null,
    display_role: roles[0] ?? null,
    roles,
    office: user.office_id ? { id: user.office_id, name: user.office_name } : null,
    directorate: user.directorate_id ? { id: user.directorate_id, name: user.directorate_name } : null,
    department: user.department_id ? { id: user.department_id, name: user.department_name } : null,
    team: user.team_id ? { id: user.team_id, name: user.team_name } : null,
  };
}

async function getUser(id: string | number) {
  const rows = await query<any[]>(
    `${userSelect} WHERE u.id = ? ${groupBy}`,
    [id],
  );

  return rows[0] ? formatUser(rows[0]) : null;
}

async function resolveDepartmentId(
  officeId: number | null,
  directorateId: number | null,
  departmentId: number | null,
) {
  if (departmentId || !directorateId || !officeId) return departmentId;

  const rows = await query<any[]>(
    "SELECT department_id FROM directorates WHERE id = ? AND office_id = ? LIMIT 1",
    [directorateId, officeId],
  );

  return normalizeId(rows[0]?.department_id);
}

async function validateScope(body: any) {
  const officeId = normalizeId(body.office_id);
  const directorateId = normalizeId(body.directorate_id);
  const departmentId = normalizeId(body.department_id);
  const teamId = normalizeId(body.team_id);
  const role = normalizeRole(body.role);

  if (!officeId) return "Office is required";

  if (!directorateId && ["Manager", "Adviser", "Director", "Team Leader", "Expert"].includes(role)) {
    return "Directorate is required for this role";
  }

  if (!departmentId && ["Manager", "Adviser"].includes(role)) {
    return "Department is required for Manager and Adviser";
  }

  if (teamId && !directorateId) {
    return "Select directorate before selecting team";
  }

  if (departmentId) {
    const rows = await query<any[]>(
      "SELECT id FROM departments WHERE id = ? AND office_id = ? AND is_active = 1 LIMIT 1",
      [departmentId, officeId],
    );

    if (!rows.length) {
      return "Selected department does not belong to selected office";
    }
  }

  if (directorateId) {
    const rows = await query<any[]>(
      "SELECT id, department_id FROM directorates WHERE id = ? AND office_id = ? LIMIT 1",
      [directorateId, officeId],
    );

    if (!rows.length) {
      return "Selected directorate does not belong to selected office";
    }

    if (departmentId && Number(rows[0].department_id) !== Number(departmentId)) {
      return "Selected directorate does not belong to selected department";
    }
  }

  if (teamId) {
    const rows = await query<any[]>(
      "SELECT id FROM teams WHERE id = ? AND directorate_id = ? LIMIT 1",
      [teamId, directorateId],
    );

    if (!rows.length) {
      return "Selected team does not belong to selected directorate";
    }
  }

  return null;
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getUser(id);

  if (!user) {
    return fail("User not found", 404);
  }

  return ok(user);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await readJson<any>(request);

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = normalizeRole(body.role);
  const officeId = normalizeId(body.office_id);
  const directorateId = normalizeId(body.directorate_id);
  const submittedDepartmentId = normalizeId(body.department_id);
  const teamId = normalizeId(body.team_id);

  if (!name || !email || !role) {
    return fail("Name, email and role are required", 422);
  }

  const scopeError = await validateScope(body);
  if (scopeError) {
    return fail(scopeError, 422);
  }

  const departmentId = await resolveDepartmentId(
    officeId,
    directorateId,
    submittedDepartmentId,
  );

  if (directorateId && !departmentId) {
    return fail("Selected directorate has no valid department assignment", 422);
  }

  await transaction(async (conn) => {
    await conn.execute(
      `UPDATE users
       SET name = ?,
           email = ?,
           phone = ?,
           status = ?,
           office_id = ?,
           directorate_id = ?,
           department_id = ?,
           team_id = ?,
           professional_level = ?
       WHERE id = ?`,
      [
        name,
        email,
        body.phone || null,
        body.status || "active",
        officeId,
        directorateId,
        departmentId,
        teamId,
        body.professional_level || null,
        id,
      ],
    );

    const [roleRows]: any = await conn.execute(
      "SELECT id FROM roles WHERE name = ? LIMIT 1",
      [role],
    );

    if (!roleRows.length) {
      throw new Error("Selected role does not exist");
    }

    await conn.execute(
      "DELETE FROM user_roles WHERE user_id = ?",
      [id],
    );

    await conn.execute(
      "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
      [id, roleRows[0].id],
    );
  });

  const user = await getUser(id);

  return ok(user, "User updated successfully");
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  await execute(
    "DELETE FROM users WHERE id = ?",
    [id],
  );

  return ok(null, "User deleted successfully");
}
