import mysql from "mysql2/promise";

// One shared connection pool for the whole app (TiDB Cloud, MySQL compatible).
// All credentials come from environment variables, never from the code.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

// In development Next.js reloads files often. Keeping the pool on "globalThis"
// stops it from opening a new pool (and new connections) on every reload.
const globalForDb = globalThis as unknown as { gkrPool?: mysql.Pool };

// The pool is created on first use (not when the file is imported),
// so "npm run build" works even when the variables are not set.
export function getPool(): mysql.Pool {
  if (!globalForDb.gkrPool) {
    globalForDb.gkrPool = mysql.createPool({
      host: requireEnv("DB_HOST"),
      port: Number(process.env.DB_PORT) || 4000,
      user: requireEnv("DB_USER"),
      password: requireEnv("DB_PASSWORD"),
      database: process.env.DB_NAME || "bank",
      // TiDB Cloud only accepts encrypted connections.
      ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
      // Small pool: every serverless instance on Vercel opens its own pool.
      connectionLimit: 5,
      waitForConnections: true,
      enableKeepAlive: true,
      connectTimeout: 10000,
      // DECIMAL columns (money) come back as strings on purpose.
      // Never turn them into JavaScript numbers for calculations.
    });
  }
  return globalForDb.gkrPool;
}
