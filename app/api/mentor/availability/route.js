import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDb, sql } from "@/lib/db";

// POST { isOnline } - mark the logged-in mentor as online or offline.
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
    if (session.role !== "mentor") return NextResponse.json({ error: "Mentor account required." }, { status: 403 });

    const { isOnline } = await request.json().catch(() => ({}));
    const pool = await getDb();

    // Upsert availability row for this mentor.
    await pool.request()
      .input("mentorId", sql.Int, Number(session.sub))
      .input("isOnline", sql.Bit, isOnline === true ? 1 : 0)
      .input("lastSeen", sql.DateTime2, new Date().toISOString())
      .query(`
        MERGE dbo.MentorAvailability AS target
        USING (SELECT @mentorId AS MentorId) AS source ON target.MentorId = source.MentorId
        WHEN MATCHED THEN
          UPDATE SET target.IsOnline = @isOnline, target.LastSeenAt = @lastSeen
        WHEN NOT MATCHED THEN
          INSERT (MentorId, IsOnline, LastSeenAt) VALUES (@mentorId, @isOnline, @lastSeen);
      `);

    return NextResponse.json({ ok: true, isOnline: isOnline === true });
  } catch (error) {
    console.error("Mentor availability failed:", error);
    return NextResponse.json({ error: "Unable to update availability." }, { status: 500 });
  }
}

// GET - return the logged-in mentor's availability status.
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
    if (session.role !== "mentor") return NextResponse.json({ error: "Mentor account required." }, { status: 403 });

    const pool = await getDb();
    const result = await pool.request()
      .input("mentorId", sql.Int, Number(session.sub))
      .query("SELECT IsOnline, LastSeenAt FROM dbo.MentorAvailability WHERE MentorId = @mentorId");
    const row = result.recordset[0];
    return NextResponse.json({ isOnline: row ? Boolean(row.IsOnline) : false, lastSeen: row ? row.LastSeenAt : null });
  } catch (error) {
    console.error("Mentor availability lookup failed:", error);
    return NextResponse.json({ error: "Unable to check availability." }, { status: 500 });
  }
}