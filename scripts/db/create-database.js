const mysql = require("mysql2/promise");
const { getDbConfig, getDatabaseName } = require("./config");

async function main() {
  const database = getDatabaseName();
  const connection = await mysql.createConnection(getDbConfig(false));

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );

  await connection.end();
  console.log(`Database ready: ${database}`);
}

main().catch((error) => {
  console.error("Database creation failed:", error.message);
  process.exit(1);
});
