import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { adminDatabaseUrl, DATABASE_NAME, databaseUrl } from "./database-url.js";

const { Pool } = pg;
const migrationsDir = fileURLToPath(new URL("../../db/migrations/", import.meta.url));

export async function ensureDatabase(): Promise<void> {
  const admin = new Pool({ connectionString: adminDatabaseUrl() });

  try {
    const found = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [DATABASE_NAME]);

    if ((found.rowCount ?? 0) === 0) {
      await admin.query(`CREATE DATABASE ${DATABASE_NAME}`);
    }
  } finally {
    await admin.end();
  }
}

export async function migrate(pool: pg.Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const applied = await pool.query<{ id: string }>("SELECT id FROM schema_migrations");
  const appliedIds = new Set(applied.rows.map((row) => row.id));
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

  for (const file of files) {
    if (appliedIds.has(file)) {
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export function createPool(): pg.Pool {
  return new Pool({ connectionString: databaseUrl() });
}
