import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { query, transaction } from "@/lib/server/db";
import { created, fail, paginated } from "@/lib/server/response";
import { pagination, readJson } from "@/lib/server/crud";

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

function normalizeRole(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeId(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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

export async function GET(request: NextRequest) {
  const { page, perPage, offset } = pagination(request);
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const status = request.nextUrl.searchParams.get("status");
  const role = request.nextUrl.searchParams.get("role")?.trim();
  const officeId = normalizeId(request.nextUrl.searchParams.get("office_id"));

  const where: string[] = [];
  const params: unknown[] = [];

  if (search) {
    where.push("(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR o.name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status && status !== "all") {
    where.push("u.status = ?");
    params.push(status);
  }

  if (officeId) {
    where.push("u.office_id = ?");
    params.push(officeId);
  }

  if (role && role !== "all") {
    where.push(
      "EXISTS (SELECT 1 FROM user_roles ur2 INNER JOIN roles r2 ON r2.id = ur2.role_id WHERE ur2.user_id = u.id AND r2.name = ?)",
    );
    params.push(role);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRows = await query<any[]>(
    `SELECT COUNT(*) AS total FROM users u LEFT JOIN offices o ON o.id = u.office_id ${whereSql}`,
    params,
  );

  const rows = await query<any[]>(
    `${userSelect} ${whereSql} ${groupBy} ORDER BY u.id DESC LIMIT ? OFFSET ?`,
    [...params, perPage, offset],
  );

  return paginated(
    rows.map(formatUser),
    page,
    perPage,
    Number(countRows[0]?.total ?? 0),
  );
}

export async function POST(request: NextRequest) {
  const body = await readJson<any>(request);

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const role = normalizeRole(body.role);
  const officeId = normalizeId(body.office_id);
  const directorateId = normalizeId(body.directorate_id);
  const submittedDepartmentId = normalizeId(body.department_id);
  const teamId = normalizeId(body.team_id);

  if (!name || !email || !password || !role) {
    return fail("Name, email, password and role are required", 422);
  }

  if (password.length < 8) {
    return fail("Password must be at least 8 characters", 422);
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

  const hash = await bcrypt.hash(password, 10);

  const userId = await transaction(async (conn) => {
    const [insert]: any = await conn.execute(
      `INSERT INTO users (
        name,
        email,
        phone,
        password,
        status,
        office_id,
        directorate_id,
        department_id,
        team_id,
        professional_level
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        body.phone || null,
        hash,
        body.status || "active",
        officeId,
        directorateId,
        departmentId,
        teamId,
        body.professional_level || null,
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
      "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
      [insert.insertId, roleRows[0].id],
    );

    return insert.insertId;
  });

  const rows = await query<any[]>(
    `${userSelect} WHERE u.id = ? ${groupBy}`,
    [userId],
  );

  return created(formatUser(rows[0]), "User created successfully");
}
