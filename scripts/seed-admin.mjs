import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import sql from "mssql/msnodesqlv8.js";

const config = {
  server: process.env.MSSQL_SERVER || "localhost",
  database: process.env.MSSQL_DATABASE || "JEE_Preparation_Platform",
  driver: process.env.MSSQL_ODBC_DRIVER || "ODBC Driver 18 for SQL Server",
  options: {
    trustedConnection: true,
    encrypt: false,
    instanceName: process.env.MSSQL_INSTANCE || "SQLEXPRESS",
  },
};

function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*";
  let pwd = "";
  for (let i = 0; i < 16; i++) {
    pwd += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return pwd;
}

async function main() {
  const args = process.argv.slice(2);
  let email = process.env.ADMIN_EMAIL?.trim() || "admin@jeecompass.com";
  let password = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email" && args[i + 1]) email = args[++i];
    if (args[i] === "--password" && args[i + 1]) password = args[++i];
  }

  if (!password) {
    password = generatePassword();
  }

  const pool = await sql.connect(config);
  const normalizedEmail = email.trim().toLowerCase();

  // Check if user exists
  const existingRes = await pool.request()
    .input("email", sql.NVarChar(320), normalizedEmail)
    .query("SELECT TOP (1) Id, Name, Email, Role FROM dbo.Users WHERE Email = @email");

  const hash = await bcrypt.hash(password, 12);
  let user;

  if (existingRes.recordset.length > 0) {
    user = existingRes.recordset[0];
    await pool.request()
      .input("id", sql.Int, user.Id)
      .input("passwordHash", sql.NVarChar(255), hash)
      .query("UPDATE dbo.Users SET Role = 'admin', PasswordHash = @passwordHash WHERE Id = @id");
    console.log(`Updated existing user (Id: ${user.Id}) to 'admin' role.`);
  } else {
    const insertRes = await pool.request()
      .input("name", sql.NVarChar(200), "Platform Administrator")
      .input("email", sql.NVarChar(320), normalizedEmail)
      .input("passwordHash", sql.NVarChar(255), hash)
      .input("role", sql.VarChar(20), "admin")
      .query("INSERT INTO dbo.Users (Name, Email, PasswordHash, Role) OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Email, INSERTED.Role VALUES (@name, @email, @passwordHash, @role)");
    user = insertRes.recordset[0];
    console.log(`Created new admin user (Id: ${user.Id}).`);
  }

  // Verification
  const verifyRes = await pool.request()
    .input("email", sql.NVarChar(320), normalizedEmail)
    .query("SELECT TOP (1) Id, Name, Email, PasswordHash, Role FROM dbo.Users WHERE Email = @email");

  const verified = verifyRes.recordset[0];
  const passwordValid = await bcrypt.compare(password, verified.PasswordHash);

  if (passwordValid && verified.Role === "admin") {
    console.log("\n========================================================");
    console.log("   ADMIN ACCOUNT VERIFIED & READY FOR LOGIN");
    console.log("========================================================");
    console.log(`Email/Username: ${verified.Email}`);
    console.log(`Password:       ${password}`);
    console.log(`Role:           ${verified.Role}`);
    console.log("========================================================\n");
  } else {
    console.error("Verification failed! Role or password did not match.");
    process.exit(1);
  }

  await sql.close();
}

main().catch((err) => {
  console.error("Admin seed failed:", err);
  sql.close();
  process.exit(1);
});
