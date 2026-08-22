const mysql = require("mysql2/promise");
const { spawnSync } = require("child_process");
const { getDbConfig } = require("./config");

async function main() {
  const connection = await mysql.createConnection(getDbConfig(true));
  const [tables] = await connection.query("SHOW TABLES");
  const tableKey = Object.keys(tables[0] || {})[0];

  await connection.query("SET FOREIGN_KEY_CHECKS=0");
  for (const row of tables) {
    const table = row[tableKey];
    await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
  }
  await connection.query("SET FOREIGN_KEY_CHECKS=1");
  await connection.end();

  console.log("Database reset completed. Running migrations and seeders...");
  const migrate = spawnSync(process.execPath, ["scripts/db/migrate.js"], { stdio: "inherit" });
  if (migrate.status !== 0) process.exit(migrate.status);

  const seed = spawnSync(process.execPath, ["scripts/db/seed.js"], { stdio: "inherit" });
  if (seed.status !== 0) process.exit(seed.status);
}

main().catch((error) => {
  console.error("Database reset failed:", error.message);
  process.exit(1);
});
