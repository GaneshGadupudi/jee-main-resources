import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDb, sql } from "@/lib/db";

// Handle ending an active/accepted video session (supports PATCH and POST for sendBeacon).
async function handleEnd(request, context) {
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

    await pool.request()
      .input("id", sql.Int, id)
      .input("mentorId", sql.Int, Number(session.sub))
      .input("endedAt", sql.DateTime2, new Date().toISOString())
      .query(`
        UPDATE dbo.MentorVideoSessions
        SET Status = 'Ended', EndedAt = @endedAt
        WHERE Id = @id AND (MentorId = @mentorId OR MentorId IS NULL)
          AND Status IN ('Accepted','Active','Assigned','Waiting');
      `);

    return NextResponse.json({ ok: true, status: "Ended" });
  } catch (error) {
    console.error("End session failed:", error);
    return NextResponse.json({ error: "Unable to end session." }, { status: 500 });
  }
}

export { handleEnd as PATCH, handleEnd as POST };
