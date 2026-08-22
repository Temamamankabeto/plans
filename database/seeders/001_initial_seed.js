const bcrypt = require("bcryptjs");

const roles = [
  ["Super Admin", "Full system administration access."],
  ["Head of Office", "Office-level management and report access."],
  ["Deputy Head of Office", "Deputy office-level report and monitoring access."],
  ["Manager", "Management-level plan review, approval, monitoring, and reporting access controlled by organizational assignment."],
  ["Adviser", "Advisory-level plan review, commenting, monitoring, and reporting access controlled by organizational assignment."],
  ["Director", "Directorate-level plan, achievement, review, and report access controlled by assignment."],
  ["Team Leader", "Team-level plan and achievement data-entry access controlled by assignment."],
  ["Expert", "Expert-level plan and achievement data-entry access controlled by assignment."],
];

const permissions = [
  ["dashboard.view", "View dashboard"],

  ["offices.view", "View offices"],
  ["offices.create", "Create offices"],
  ["offices.update", "Update offices"],
  ["offices.delete", "Delete offices"],

  ["directorates.view", "View directorates"],
  ["directorates.create", "Create directorates"],
  ["directorates.update", "Update directorates"],
  ["directorates.delete", "Delete directorates"],

  ["departments.view", "View departments"],
  ["departments.create", "Create departments"],
  ["departments.update", "Update departments"],
  ["departments.delete", "Delete departments"],

  ["teams.view", "View teams"],
  ["teams.create", "Create teams"],
  ["teams.update", "Update teams"],
  ["teams.delete", "Delete teams"],

  ["users.view", "View users"],
  ["users.create", "Create users"],
  ["users.update", "Update users"],
  ["users.delete", "Delete users"],

  ["roles.view", "View roles"],
  ["roles.create", "Create roles"],
  ["roles.update", "Update roles"],
  ["roles.delete", "Delete roles"],

  ["permissions.view", "View permissions"],
  ["permissions.create", "Create permissions"],
  ["permissions.update", "Update permissions"],
  ["permissions.delete", "Delete permissions"],

  ["crop-types.view", "View crop types"],
  ["crop-types.manage", "Manage crop types"],
  ["crops.view", "View crops"],
  ["crops.manage", "Manage crops"],

  ["livestock-products.view", "View livestock products"],
  ["livestock-products.manage", "Manage livestock products"],
  ["livestock-product-types.view", "View livestock product types"],
  ["livestock-product-types.manage", "Manage livestock product types"],

  ["work-types.view", "View work types"],
  ["work-types.manage", "Manage work types"],
  ["works.view", "View works"],
  ["works.manage", "Manage works"],

  ["planning_records.read", "View planning records"],
  ["planning_records.create", "Create planning records"],
  ["planning_records.update", "Update planning records"],
  ["planning_records.delete", "Delete planning records"],
  ["planning_records.approve", "Approve planning records"],
  ["planning_records.comment", "Comment on planning records"],
  ["planning-records.view", "View plans and achievements"],
  ["planning-records.create", "Create plans and achievements"],
  ["planning-records.update", "Update plans and achievements"],
  ["planning-records.delete", "Delete plans and achievements"],
  ["planning-records.approve", "Approve plans and achievements"],

  ["trade_records.read", "View Trade value chain records"],
  ["trade_records.create", "Create Trade annual/monthly plans"],
  ["trade_records.update", "Update Trade plans and achievements"],
  ["trade_records.delete", "Delete Trade records"],
  ["trade_records.approve", "Approve or return Trade records"],
  ["trade_records.comment", "Comment on Trade records"],
  ["trade_reports.read", "View Trade value chain reports"],

  ["reports.read", "View reports"],
  ["reports.view", "View reports"],
  ["audit.view", "View audit logs"],
];

async function getId(connection, table, column, value) {
  const [rows] = await connection.execute(`SELECT id FROM ${table} WHERE ${column} = ? LIMIT 1`, [value]);
  return rows[0]?.id ?? null;
}

async function tableHasColumn(connection, table, column) {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column],
  );
  return rows.length > 0;
}

module.exports = async function seed(connection) {
  const passwordHash = await bcrypt.hash("password", 10);
  const usersHaveTeamId = await tableHasColumn(connection, "users", "team_id");

  for (const [name, description] of roles) {
    await connection.execute(
      `INSERT INTO roles (name, description)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE description = VALUES(description)`,
      [name, description],
    );
  }

  for (const [name, description] of permissions) {
    await connection.execute(
      `INSERT INTO permissions (name, description)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE description = VALUES(description)`,
      [name, description],
    );
  }

  await connection.execute(`
    INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'Super Admin'
  `);

  await connection.execute(`
    INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    INNER JOIN permissions p ON p.name IN (
      'dashboard.view',
      'planning_records.read',
      'planning_records.comment',
      'planning_records.approve',
      'reports.read',
      'reports.view',
      'trade_records.read',
      'trade_records.comment',
      'trade_records.approve',
      'trade_reports.read'
    )
    WHERE r.name = 'Manager'
  `);

  await connection.execute(`
    INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    INNER JOIN permissions p ON p.name IN (
      'dashboard.view',
      'planning_records.read',
      'planning_records.comment',
      'reports.read',
      'reports.view',
      'trade_records.read',
      'trade_records.comment',
      'trade_reports.read'
    )
    WHERE r.name = 'Adviser'
  `);

  if (usersHaveTeamId) {
    await connection.execute(
      `INSERT INTO users (name, email, phone, password, status, office_id, department_id, team_id, professional_level)
       VALUES (?, ?, ?, ?, 'active', NULL, NULL, NULL, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         phone = VALUES(phone),
         password = VALUES(password),
         status = 'active',
         office_id = NULL,
         department_id = NULL,
         team_id = NULL,
         professional_level = VALUES(professional_level)`,
      ["System Administrator", "admin@plan.local", "+251900000001", passwordHash, "Super Admin"],
    );
  } else {
    await connection.execute(
      `INSERT INTO users (name, email, phone, password, status, office_id, department_id, professional_level)
       VALUES (?, ?, ?, ?, 'active', NULL, NULL, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         phone = VALUES(phone),
         password = VALUES(password),
         status = 'active',
         office_id = NULL,
         department_id = NULL,
         professional_level = VALUES(professional_level)`,
      ["System Administrator", "admin@plan.local", "+251900000001", passwordHash, "Super Admin"],
    );
  }

  const userId = await getId(connection, "users", "email", "admin@plan.local");
  const roleId = await getId(connection, "roles", "name", "Super Admin");
  if (userId && roleId) {
    await connection.execute(`DELETE FROM user_roles WHERE user_id = ?`, [userId]);
    await connection.execute(`INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`, [userId, roleId]);
  }
};
