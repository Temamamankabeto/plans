const permissions = [
  // User Management
  ["users.read", "View users"],
  ["users.view", "View users"],
  ["users.create", "Create users"],
  ["users.update", "Update users"],
  ["users.delete", "Delete users"],
  ["roles.read", "View roles"],
  ["roles.view", "View roles"],
  ["roles.create", "Create roles"],
  ["roles.update", "Update roles"],
  ["roles.delete", "Delete roles"],
  ["roles.assign-permissions", "Assign permissions to roles"],
  ["permissions.read", "View permissions"],
  ["permissions.view", "View permissions"],
  ["permissions.create", "Create permissions"],
  ["permissions.update", "Update permissions"],
  ["permissions.delete", "Delete permissions"],
  ["permissions.assign", "Assign permissions"],
  ["access_mappings.read", "View access mappings"],
  ["access_mappings.view", "View access mappings"],
  ["access_mappings.create", "Create access mappings"],
  ["access_mappings.update", "Update access mappings"],
  ["access_mappings.delete", "Delete access mappings"],
  ["access_mappings.manage", "Manage access mappings"],

  // Organization
  ["offices.read", "View offices"],
  ["offices.view", "View offices"],
  ["offices.create", "Create offices"],
  ["offices.update", "Update offices"],
  ["offices.delete", "Delete offices"],
  ["directorates.read", "View directorates"],
  ["directorates.view", "View directorates"],
  ["directorates.create", "Create directorates"],
  ["directorates.update", "Update directorates"],
  ["directorates.delete", "Delete directorates"],
  ["departments.read", "View departments"],
  ["departments.view", "View departments"],
  ["departments.create", "Create departments"],
  ["departments.update", "Update departments"],
  ["departments.delete", "Delete departments"],
  ["teams.read", "View teams"],
  ["teams.view", "View teams"],
  ["teams.create", "Create teams"],
  ["teams.update", "Update teams"],
  ["teams.delete", "Delete teams"],

  // Planning Master Data
  ["crop_types.read", "View crop types"],
  ["crop_types.create", "Create crop types"],
  ["crop_types.update", "Update crop types"],
  ["crop_types.delete", "Delete crop types"],
  ["crop_types.manage", "Manage crop types"],
  ["crops.read", "View crops"],
  ["crops.create", "Create crops"],
  ["crops.update", "Update crops"],
  ["crops.delete", "Delete crops"],
  ["crops.manage", "Manage crops"],
  ["livestock_products.read", "View livestock products"],
  ["livestock_products.create", "Create livestock products"],
  ["livestock_products.update", "Update livestock products"],
  ["livestock_products.delete", "Delete livestock products"],
  ["livestock_products.manage", "Manage livestock products"],
  ["livestock_product_types.read", "View livestock product types"],
  ["livestock_product_types.create", "Create livestock product types"],
  ["livestock_product_types.update", "Update livestock product types"],
  ["livestock_product_types.delete", "Delete livestock product types"],
  ["livestock_product_types.manage", "Manage livestock product types"],
  ["work_types.read", "View work types"],
  ["work_types.create", "Create work types"],
  ["work_types.update", "Update work types"],
  ["work_types.delete", "Delete work types"],
  ["work_types.manage", "Manage work types"],
  ["works.read", "View works"],
  ["works.create", "Create works"],
  ["works.update", "Update works"],
  ["works.delete", "Delete works"],
  ["works.manage", "Manage works"],

  // Settings and Audit
  ["planning_settings.read", "View planning settings"],
  ["planning_settings.view", "View planning settings"],
  ["planning_settings.update", "Update planning settings"],
  ["planning_settings.manage", "Manage planning settings"],
  ["translations.read", "View translations"],
  ["translations.view", "View translations"],
  ["translations.create", "Create translations"],
  ["translations.update", "Update translations"],
  ["translations.delete", "Delete translations"],
  ["translations.manage", "Manage translations"],
  ["audit_logs.read", "View audit logs"],
  ["audit_logs.view", "View audit logs"],
];

module.exports = async function seed(connection) {
  await connection.beginTransaction();

  try {
    for (const [name, description] of permissions) {
      await connection.execute(
        `INSERT INTO permissions (name, description)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE description = VALUES(description)`,
        [name, description],
      );
    }

    const permissionNames = permissions.map(([name]) => name);
    const placeholders = permissionNames.map(() => "?").join(", ");

    await connection.execute(
      `INSERT IGNORE INTO role_permissions (role_id, permission_id)
       SELECT r.id, p.id
       FROM roles r
       INNER JOIN permissions p ON p.name IN (${placeholders})
       WHERE r.name = 'Super Admin'`,
      permissionNames,
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
};
