// Usage: node --env-file=.env.local scripts/seed-mentor.mjs
// Creates a dummy mentor account for testing the mentor desk.
// Email: mentor@jeecompass.in  Password: Mentor@1234
import { createRequire } from "node:module";
import bcrypt from "bcryptjs";

const sql = createRequire(import.meta.url)("mssql/msnodesqlv8");
const pool = await sql.connect({
  server: process.env.MSSQL_SERVER || "localhost",
  database: process.env.MSSQL_DATABASE || "JEE_Preparation_Platform",
  driver: process.env.MSSQL_ODBC_DRIVER || "ODBC Driver 18 for SQL Server",
  options: { trustedConnection: true, encrypt: false, instanceName: process.env.MSSQL_INSTANCE || "SQLEXPRESS" },
});

const email = "mentor@jeecompass.in";
const password = "Mentor@1234";
const name = "Rajesh Sharma (Mentor)";
const role = "mentor";

// Check if mentor already exists
const existing = await pool.request()
  .input("email", sql.NVarChar(320), email)
  .query("SELECT TOP (1) Id FROM dbo.Users WHERE Email = @email");

if (existing.recordset.length > 0) {
  // Update role to mentor if it's a student account
  await pool.request()
    .input("email", sql.NVarChar(320), email)
    .input("role", sql.VarChar(10), role)
    .query("UPDATE dbo.Users SET Role = @role WHERE Email = @email");
  console.log(`✓ Mentor account updated: ${email} (Role: ${role})`);
} else {
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.request()
    .input("name", sql.NVarChar(200), name)
    .input("email", sql.NVarChar(320), email)
    .input("passwordHash", sql.NVarChar(255), passwordHash)
    .input("role", sql.VarChar(10), role)
    .query("INSERT INTO dbo.Users (Name, Email, PasswordHash, Role) OUTPUT INSERTED.Id VALUES (@name, @email, @passwordHash, @role)");
  console.log(`✓ Mentor account created: ${email} (Id: ${result.recordset[0].Id}, Role: ${role})`);
}

console.log(`\nDummy mentor login credentials:`);
console.log(`  Email:    ${email}`);
console.log(`  Password: ${password}`);
console.log(`\nLog in at /login, then you'll be redirected to /mentor/dashboard`);

await pool.close();