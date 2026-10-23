import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDb, sql } from "@/lib/db";

// GET - list video sessions for the logged-in mentor (waiting, accepted, active, and recent history).
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
    if (session.role !== "mentor") return NextResponse.json({ error: "Mentor account required." }, { status: 403 });

    const pool = await getDb();
    const result = await pool.request()
      .input("mentorId", sql.Int, Number(session.sub))
      .query(`
        SELECT v.Id, v.VideoRoomId, v.Status, v.Context, v.StartedAt, v.AcceptedAt, v.EndedAt,
               u.Name AS StudentName, u.Email AS StudentEmail
        FROM dbo.MentorVideoSessions v
        JOIN dbo.Users u ON u.Id = v.StudentId
        WHERE (v.MentorId IS NULL OR v.MentorId = @mentorId)
          AND (
            v.Status IN ('Waiting', 'Assigned', 'Accepted', 'Active')
            OR (v.Status IN ('Ended', 'Cancelled') AND v.EndedAt >= DATEADD(day, -1, SYSUTCDATETIME()))
          )
        ORDER BY v.StartedAt DESC
      `);
    return NextResponse.json({ sessions: result.recordset.map((r) => ({
      id: Number(r.Id),
      roomId: r.VideoRoomId,
      status: r.Status,
      context: r.Context || "",
      startedAt: r.StartedAt,
      acceptedAt: r.AcceptedAt,
      endedAt: r.EndedAt,
      student: { name: r.StudentName, email: r.StudentEmail },
    })) });
  } catch (error) {
    console.error("Mentor sessions lookup failed:", error);
    return NextResponse.json({ error: "Unable to load sessions." }, { status: 500 });
  }
}