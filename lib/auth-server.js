import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getDb, sql } from "@/lib/db";

const SESSION_COOKIE = "jee_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SESSION_SECRET must be at least 32 characters.");
  return secret;
}

function sign(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verify(token) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
}

export async function findUserByEmail(email) {
  const pool = await getDb();
  const result = await pool.request().input("email", sql.NVarChar(320), email.toLowerCase()).query("SELECT TOP (1) Id, Name, Email, PasswordHash FROM dbo.Users WHERE Email = @email");
  return result.recordset[0] || null;
}

export async function registerUser({ name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  if (await findUserByEmail(normalizedEmail)) throw new Error("An account with that email already exists.");
  const passwordHash = await bcrypt.hash(password, 12);
  const pool = await getDb();
  const result = await pool.request()
    .input("name", sql.NVarChar(200), name.trim())
    .input("email", sql.NVarChar(320), normalizedEmail)
    .input("passwordHash", sql.NVarChar(255), passwordHash)
    .query("INSERT INTO dbo.Users (Name, Email, PasswordHash) OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Email VALUES (@name, @email, @passwordHash)");
  return result.recordset[0];
}

export async function authenticateUser(email, password) {
  const user = await findUserByEmail(email.trim().toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.PasswordHash))) return null;
  return { id: user.Id, name: user.Name, email: user.Email };
}

export async function createSession(user) {
  const value = sign({ sub: String(user.id), name: user.name, email: user.email, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS });
  const store = await cookies();
  store.set(SESSION_COOKIE, value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: SESSION_TTL_SECONDS, path: "/" });
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? verify(token) : null;
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
