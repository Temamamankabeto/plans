const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { getDbConfig } = require("./config");

const seedersDir = path.join(process.cwd(), "database", "seeders");
const shouldFresh =
  process.argv.includes("--fresh") ||
  process.env.npm_config_fresh === "true" ||
  process.env.DB_SEED_FRESH === "true";

const tablesToTruncateForFreshSeed = [
  "trade_value_chain_records",
  "trade_records",
  "planning_records",
  "audit_logs",
  "achievements",
  "plans",
  "user_roles",
  "role_permissions",
  "users",
  "permissions",
  "roles",
  "teams",
  "directorates",
  "offices",
  "crops",
  "crop_types",
  "livestock_product_types",
  "livestock_products",
  "works",
  "work_types",
  "_seeders",
];

async function tableExists(connection, tableName) {
  const [rows] = await connection.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [tableName]
  );
  return rows.length > 0;
}

async function truncateTableIfExists(connection, tableName) {
  if (!(await tableExists(connection, tableName))) return;
  await connection.query(`TRUNCATE TABLE \`${tableName}\``);
}

async function ensureSeedersTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS _seeders (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(191) NOT NULL UNIQUE,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function freshSeedDatabase(connection) {
  console.log("Fresh seed requested. Clearing seeded data...");
  await connection.query("SET FOREIGN_KEY_CHECKS=0");
  for (const tableName of tablesToTruncateForFreshSeed) {
    await truncateTableIfExists(connection, tableName);
  }
  await connection.query("SET FOREIGN_KEY_CHECKS=1");
  await ensureSeedersTable(connection);
}

async function runSqlSeeder(connection, file) {
  const sql = fs.readFileSync(path.join(seedersDir, file), "utf8").trim();
  if (!sql) {
    console.log(`Skipped empty seeder: ${file}`);
    return;
  }
  await connection.query(sql);
}

async function runJsSeeder(connection, file) {
  const seederPath = path.join(seedersDir, file);
  delete require.cache[require.resolve(seederPath)];
  const seeder = require(seederPath);
  if (typeof seeder !== "function") {
    throw new Error(`${file} must export an async function.`);
  }
  await seeder(connection);
}

async function main() {
  if (!fs.existsSync(seedersDir)) {
    throw new Error("database/seeders folder does not exist.");
  }

  const connection = await mysql.createConnection(getDbConfig(true));

  await ensureSeedersTable(connection);

  if (shouldFresh) {
    await freshSeedDatabase(connection);
  }

  const [appliedRows] = await connection.query("SELECT name FROM _seeders");
  const applied = new Set(appliedRows.map((row) => row.name));

  const files = fs
    .readdirSync(seedersDir)
    .filter((file) => file.endsWith(".sql") || file.endsWith(".js"))
    .sort();

  for (const file of files) {
    if (!shouldFresh && applied.has(file)) {
      console.log(`Skipped seeder: ${file}`);
      continue;
    }

    console.log(`Running seeder: ${file}`);
    if (file.endsWith(".js")) {
      await runJsSeeder(connection, file);
    } else {
      await runSqlSeeder(connection, file);
    }
    await connection.query("INSERT IGNORE INTO _seeders (name) VALUES (?)", [file]);
  }

  await connection.end();
  console.log("Seeders completed successfully.");
}

main().catch((error) => {
  console.error("Seeding failed:", error.message);
  process.exit(1);
});
