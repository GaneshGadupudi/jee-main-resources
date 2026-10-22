import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDb, sql } from "@/lib/db";

// PATCH - end an active/accepted video session.
export async function PATCH(request, context) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
    if (session.role !== "mentor") return NextResponse.json({ error: "Mentor account required." }, { status: 403 });

    const rawParams = context?.params ? await context.params : {};
    const id = Number(rawParams?.id);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid session ID." }, { status: 400 });
    }

    const pool = await getDb();

    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("mentorId", sql.Int, Number(session.sub))
      .input("endedAt", sql.DateTime2, new Date().toISOString())
      .query(`
        UPDATE dbo.MentorVideoSessions
        SET Status = 'Ended', EndedAt = @endedAt
        WHERE Id = @id AND MentorId = @mentorId AND Status IN ('Accepted','Active','Assigned');
      `);

    if (!result.rowsAffected[0]) {
      return NextResponse.json({ error: "Session not found or not active." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, status: "Ended" });
  } catch (error) {
    console.error("End session failed:", error);
    return NextResponse.json({ error: "Unable to end session." }, { status: 500 });
  }
}
