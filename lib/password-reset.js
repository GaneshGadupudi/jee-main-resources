import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { getDb, sql } from "@/lib/db";
import { HttpError } from "@/lib/api-user";
import { sendMail } from "@/lib/mailer";

const TTL_MINUTES = 60;
const MAX_LINKS_PER_HOUR = 3;
const hashOf = (token) => crypto.createHash("sha256").update(String(token)).digest();

// Emails a reset link. Never reveals whether the address has an account: the caller always answers the same way.
export async function requestReset(email, origin) {
  const pool = await getDb();
  const user = (await pool.request().input("e", sql.NVarChar(320), String(email).trim().toLowerCase())
    .query("SELECT TOP (1) Id, Name, Email FROM dbo.Users WHERE Email = @e")).recordset[0];
  if (!user) return;

  const recent = (await pool.request().input("u", sql.Int, user.Id)
    .query("SELECT COUNT(*) AS n FROM dbo.PasswordResetTokens WHERE UserId = @u AND CreatedAt > DATEADD(HOUR, -1, SYSUTCDATETIME())")).recordset[0].n;
  if (recent >= MAX_LINKS_PER_HOUR) return; // stops someone using this form to flood an inbox

  const token = crypto.randomBytes(32).toString("base64url");
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    await new sql.Request(tx).input("u", sql.Int, user.Id).query("UPDATE dbo.PasswordResetTokens SET UsedAt = SYSUTCDATETIME() WHERE UserId = @u AND UsedAt IS NULL");
    await new sql.Request(tx).input("u", sql.Int, user.Id).input("h", sql.VarBinary(32), hashOf(token)).input("ttl", sql.Int, TTL_MINUTES)
      .query("INSERT INTO dbo.PasswordResetTokens (UserId, TokenHash, ExpiresAt) VALUES (@u, @h, DATEADD(MINUTE, @ttl, SYSUTCDATETIME()))");
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  }

  const link = `${(process.env.APP_URL || origin).replace(/\/$/, "")}/reset-password?token=${token}`;
  const name = String(user.Name || "").split(" ")[0] || "there";
  try {
    await sendMail({
      to: user.Email, subject: "Reset your JEE Preparation Platform password",
      text: `Hi ${name},\n\nUse this link to choose a new password. It works once and expires in ${TTL_MINUTES} minutes:\n\n${link}\n\nIf you did not ask for this, you can ignore this email - your password has not changed.`,
      html: `<p>Hi ${name},</p><p>Use this link to choose a new password. It works once and expires in ${TTL_MINUTES} minutes:</p><p><a href="${link}">Reset my password</a></p><p>If you did not ask for this, you can ignore this email - your password has not changed.</p>`,
    });
  } catch (error) {
    console.error("Could not send the password reset email:", error);
  }
}

export async function isResetTokenValid(token) {
  if (!token) return false;
  const pool = await getDb();
  const row = (await pool.request().input("h", sql.VarBinary(32), hashOf(token))
    .query("SELECT TOP (1) Id FROM dbo.PasswordResetTokens WHERE TokenHash = @h AND UsedAt IS NULL AND ExpiresAt > SYSUTCDATETIME()")).recordset[0];
  return !!row;
}

export async function resetPassword(token, password) {
  if (typeof password !== "string" || password.length < 6) throw new HttpError(400, "Password must be at least 6 characters.");
  if (password.length > 200) throw new HttpError(400, "That password is too long.");
  const passwordHash = await bcrypt.hash(password, 12);
  const pool = await getDb();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    // UPDLOCK so two simultaneous uses of one link cannot both succeed.
    const row = (await new sql.Request(tx).input("h", sql.VarBinary(32), hashOf(token || ""))
      .query("SELECT TOP (1) Id, UserId FROM dbo.PasswordResetTokens WITH (UPDLOCK, ROWLOCK) WHERE TokenHash = @h AND UsedAt IS NULL AND ExpiresAt > SYSUTCDATETIME()")).recordset[0];
    if (!row) throw new HttpError(400, "This reset link is invalid or has expired. Please request a new one.");
    await new sql.Request(tx).input("u", sql.Int, row.UserId).input("p", sql.NVarChar(255), passwordHash).query("UPDATE dbo.Users SET PasswordHash = @p WHERE Id = @u");
    await new sql.Request(tx).input("u", sql.Int, row.UserId).query("UPDATE dbo.PasswordResetTokens SET UsedAt = SYSUTCDATETIME() WHERE UserId = @u AND UsedAt IS NULL");
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}
