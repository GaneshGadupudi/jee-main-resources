// Usage: node --env-file=.env.local scripts/migrate-db.mjs
// Applies every SQL file in database/ in dependency order. Each file is idempotent, so this is safe to re-run.
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

// Same connection settings as lib/db.js (that file relies on Next's module resolution, so it can't be imported from plain Node).
const sql = createRequire(import.meta.url)("mssql/msnodesqlv8");
const pool = await sql.connect({
  server: process.env.MSSQL_SERVER || "localhost",
  database: process.env.MSSQL_DATABASE || "JEE_Preparation_Platform",
  driver: process.env.MSSQL_ODBC_DRIVER || "ODBC Driver 18 for SQL Server",
  options: { trustedConnection: true, encrypt: false, instanceName: process.env.MSSQL_INSTANCE || "SQLEXPRESS" },
});

// Order matters: everything references dbo.Users.
const FILES = ["Users", "Auth", "UserPreferences", "StudyPlan", "Practice", "Tests", "Engagement", "PYQ", "StudyCircle"];

for (const name of FILES) {
  await pool.request().batch(await readFile(new URL(`../database/${name}.sql`, import.meta.url), "utf8"));
  console.log(`✓ ${name}.sql`);
}
await pool.close();
