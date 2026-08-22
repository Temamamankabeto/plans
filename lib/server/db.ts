import mysql, { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

let pool: Pool | undefined;

function requiredEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: requiredEnv("MYSQL_HOST", "127.0.0.1"),
      port: Number(requiredEnv("MYSQL_PORT", "3306")),
      database: requiredEnv("MYSQL_DATABASE", "plan_achievement"),
      user: requiredEnv("MYSQL_USER", "root"),
      password: process.env.MYSQL_PASSWORD ?? "",
      waitForConnections: true,
      connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT ?? 10),
      namedPlaceholders: true,
      decimalNumbers: true,
      dateStrings: false,
    });
  }
  return pool;
}

export type DbParams = unknown[] | Record<string, unknown>;

export async function query<T extends RowDataPacket[]>(sql: string, params: DbParams = []) {
  const [rows] = await getPool().query<T>(sql, params as never);
  return rows;
}

export async function execute(sql: string, params: DbParams = []) {
  const [result] = await getPool().execute<ResultSetHeader>(sql, params as never);
  return result;
}

export async function transaction<T>(callback: (connection: PoolConnection) => Promise<T>) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
