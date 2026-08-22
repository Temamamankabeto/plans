const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { getDbConfig } = require("./config");

const migrationsDir = path.join(process.cwd(), "database", "migrations");
const shouldFresh = process.argv.includes("--fresh") || process.env.DB_MIGRATE_FRESH === "true";

async function dropAllTables(connection) {
  const [tables] = await connection.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
  const tableKey = Object.keys(tables[0] || {})[0];

  if (!tableKey || tables.length === 0) return;

  console.log("Fresh migration requested. Dropping existing tables...");
  await connection.query("SET FOREIGN_KEY_CHECKS=0");
  for (const row of tables) {
    const tableName = row[tableKey];
    await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
  }
  await connection.query("SET FOREIGN_KEY_CHECKS=1");
}

async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(191) NOT NULL UNIQUE,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function main() {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error("database/migrations folder does not exist.");
  }

  const connection = await mysql.createConnection(getDbConfig(true));

  if (shouldFresh) {
    await dropAllTables(connection);
  }

  await ensureMigrationsTable(connection);

  const [appliedRows] = await connection.query("SELECT name FROM _migrations");
  const applied = new Set(appliedRows.map((row) => row.name));

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (!shouldFresh && applied.has(file)) {
      console.log(`Skipped migration: ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8").trim();
    if (!sql) {
      console.log(`Skipped empty migration: ${file}`);
      continue;
    }

    console.log(`Running migration: ${file}`);
    await connection.query(sql);
    await connection.query("INSERT IGNORE INTO _migrations (name) VALUES (?)", [file]);
  }

  await connection.end();
  console.log("Migrations completed successfully.");
}

main().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
