export const DATABASE_NAME = "mente_colectiva";

export function databaseUrl(): string {
  return process.env.DATABASE_URL ?? `postgres://127.0.0.1:5432/${DATABASE_NAME}`;
}

export function adminDatabaseUrl(): string {
  return process.env.DATABASE_ADMIN_URL ?? "postgres://127.0.0.1:5432/postgres";
}
