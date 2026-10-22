import { userRoute } from "@/lib/api-user";
import { getDb, sql } from "@/lib/db";
import crypto from "node:crypto";

// GET - return the student's latest active/waiting video session.
export const GET = userRoute(async ({ userId }) => {
  const pool = await getDb();
  const result = await pool.request()
    .input("studentId", sql.Int, userId)
    .query(`
      SELECT TOP (1) v.Id, v.VideoRoomId, v.Status, v.Context, v.StartedAt, v.AcceptedAt,
                     u.Name AS MentorName, u.Email AS MentorEmail
      FROM dbo.MentorVideoSessions v
      LEFT JOIN dbo.Users u ON u.Id = v.MentorId
      WHERE v.StudentId = @studentId AND v.Status IN ('Waiting', 'Assigned', 'Accepted', 'Active')
      ORDER BY v.StartedAt DESC
    `);

  const row = result.recordset[0];
  if (!row) return { session: null };

  return {
    session: {
      id: Number(row.Id),
      roomId: row.VideoRoomId,
      status: row.Status,
      context: row.Context,
      startedAt: row.StartedAt,
      acceptedAt: row.AcceptedAt,
      mentor: row.MentorName ? { name: row.MentorName, email: row.MentorEmail } : null,
    },
  };
});

// POST { context? } - create a waiting video session and assign the first online mentor.
export const POST = userRoute(async ({ userId, body }) => {
  const pool = await getDb();
  const roomId = `jee-vid-${crypto.randomBytes(8).toString("hex")}`;
  const context = typeof body?.context === "string" ? body.context.slice(0, 1000) : null;

  await pool.request()
    .input("studentId", sql.Int, userId)
    .input("roomId", sql.NVarChar(100), roomId)
    .input("context", sql.NVarChar(1000), context)
    .query(`
      INSERT INTO dbo.MentorVideoSessions (StudentId, VideoRoomId, Status, Context)
      VALUES (@studentId, @roomId, 'Waiting', @context);
    `);

  // Try to assign an online mentor automatically.
  const assignResult = await pool.request()
    .input("roomId", sql.NVarChar(100), roomId)
    .query(`
      UPDATE TOP (1) dbo.MentorVideoSessions
      SET MentorId = (SELECT TOP (1) MentorId FROM dbo.MentorAvailability WHERE IsOnline = 1 ORDER BY LastSeenAt DESC),
          Status = 'Assigned'
      WHERE VideoRoomId = @roomId AND Status = 'Waiting'
        AND EXISTS (SELECT 1 FROM dbo.MentorAvailability WHERE IsOnline = 1);
    `);

  const assigned = (assignResult.rowsAffected[0] || 0) > 0;
  return { ok: true, roomId, status: assigned ? "Assigned" : "Waiting" };
});

// DELETE - cancel the student's waiting or assigned video session.
export const DELETE = userRoute(async ({ userId }) => {
  const pool = await getDb();
  await pool.request()
    .input("studentId", sql.Int, userId)
    .query(`
      UPDATE dbo.MentorVideoSessions
      SET Status = 'Cancelled', EndedAt = SYSUTCDATETIME()
      WHERE StudentId = @studentId AND Status IN ('Waiting', 'Assigned');
    `);

  return { ok: true };
});





