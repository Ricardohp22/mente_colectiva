import { ensureDatabase, migrate, createPool } from "./migrate.js";

const pool = createPool();

try {
  await ensureDatabase();
  await migrate(pool);
  console.log("Migraciones aplicadas");
} finally {
  await pool.end();
}
