const fs = require("fs");
const path = require("path");

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    value = value.replace(/^['\"]|['\"]$/g, "");

    if (!process.env[key]) process.env[key] = value;
  }
}

function getDbConfig(includeDatabase = true) {
  loadEnvFile();

  const config = {
    host: process.env.MYSQL_HOST || process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
    user: process.env.MYSQL_USER || process.env.DB_USER || "root",
    password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || "",
    multipleStatements: true,
  };

  if (includeDatabase) {
    config.database = process.env.MYSQL_DATABASE || process.env.DB_NAME || "plan_achievement";
  }

  return config;
}

function getDatabaseName() {
  loadEnvFile();
  return process.env.MYSQL_DATABASE || process.env.DB_NAME || "plan_achievement";
}

module.exports = { getDbConfig, getDatabaseName };
