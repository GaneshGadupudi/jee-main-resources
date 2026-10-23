import { userRoute } from "@/lib/api-user";
import { getDb, sql } from "@/lib/db";
import crypto from "node:crypto";

// GET - return the student's latest active/waiting or recently ended video session.
export const GET = userRoute(async ({ userId, query }) => {
  const pool = await getDb();
  const roomId = query?.get("roomId") || null;

  let result;
  if (roomId) {
    result = await pool.request()
      .input("studentId", sql.Int, userId)
      .input("roomId", sql.NVarChar(100), roomId)
      .query(`
        SELECT TOP (1) v.Id, v.VideoRoomId, v.Status, v.Context, v.StartedAt, v.AcceptedAt, v.EndedAt,
                       u.Name AS MentorName, u.Email AS MentorEmail
        FROM dbo.MentorVideoSessions v
        LEFT JOIN dbo.Users u ON u.Id = v.MentorId
        WHERE v.StudentId = @studentId AND v.VideoRoomId = @roomId
        ORDER BY v.StartedAt DESC
      `);
  } else {
    result = await pool.request()
      .input("studentId", sql.Int, userId)
      .query(`
        SELECT TOP (1) v.Id, v.VideoRoomId, v.Status, v.Context, v.StartedAt, v.AcceptedAt, v.EndedAt,
                       u.Name AS MentorName, u.Email AS MentorEmail
        FROM dbo.MentorVideoSessions v
        LEFT JOIN dbo.Users u ON u.Id = v.MentorId
        WHERE v.StudentId = @studentId AND (
          v.Status IN ('Waiting', 'Assigned', 'Accepted', 'Active')
          OR (v.Status IN ('Ended', 'Cancelled') AND v.EndedAt >= DATEADD(minute, -2, SYSUTCDATETIME()))
        )
        ORDER BY v.StartedAt DESC
      `);
  }

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
      endedAt: row.EndedAt,
      mentor: row.MentorName ? { name: row.MentorName, email: row.MentorEmail } : null,
    },
  };
});

// POST - create a waiting video session OR end session (if action === 'end')
export const POST = userRoute(async ({ userId, body }) => {
  const pool = await getDb();

  // If action is "end", treat this POST as an end-session call (supports sendBeacon)
  if (body?.action === "end") {
    const roomId = typeof body?.roomId === "string" ? body.roomId : null;
    await pool.request()
      .input("studentId", sql.Int, userId)
      .input("roomId", sql.NVarChar(100), roomId)
      .query(`
        UPDATE dbo.MentorVideoSessions
        SET Status = 'Ended', EndedAt = SYSUTCDATETIME()
        WHERE StudentId = @studentId
          AND (@roomId IS NULL OR VideoRoomId = @roomId)
          AND Status IN ('Waiting', 'Assigned', 'Accepted', 'Active');
      `);
    return { ok: true, status: "Ended" };
  }

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

// PATCH - end or leave an active/accepted session from the student side.
export const PATCH = userRoute(async ({ userId, body }) => {
  const pool = await getDb();
  const roomId = typeof body?.roomId === "string" ? body.roomId : null;

  const result = await pool.request()
    .input("studentId", sql.Int, userId)
    .input("roomId", sql.NVarChar(100), roomId)
    .query(`
      UPDATE dbo.MentorVideoSessions
      SET Status = 'Ended', EndedAt = SYSUTCDATETIME()
      WHERE StudentId = @studentId
        AND (@roomId IS NULL OR VideoRoomId = @roomId)
        AND Status IN ('Waiting', 'Assigned', 'Accepted', 'Active');
    `);

  return { ok: true, status: "Ended", ended: (result.rowsAffected[0] || 0) > 0 };
});

// DELETE - cancel the student's video session.
export const DELETE = userRoute(async ({ userId, query }) => {
  const pool = await getDb();
  const roomId = query?.get("roomId") || null;

  await pool.request()
    .input("studentId", sql.Int, userId)
    .input("roomId", sql.NVarChar(100), roomId)
    .query(`
      UPDATE dbo.MentorVideoSessions
      SET Status = CASE WHEN Status IN ('Accepted', 'Active') THEN 'Ended' ELSE 'Cancelled' END,
          EndedAt = SYSUTCDATETIME()
      WHERE StudentId = @studentId
        AND (@roomId IS NULL OR VideoRoomId = @roomId)
        AND Status IN ('Waiting', 'Assigned', 'Accepted', 'Active');
    `);

  return { ok: true };
});
