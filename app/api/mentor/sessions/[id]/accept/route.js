import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDb, sql } from "@/lib/db";

// PATCH - accept a waiting or assigned video session as the mentor.
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

    // Claim a waiting session or accept an already-assigned session.
    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("mentorId", sql.Int, Number(session.sub))
      .input("acceptedAt", sql.DateTime2, new Date().toISOString())
      .query(`
        UPDATE dbo.MentorVideoSessions
        SET MentorId = @mentorId, Status = 'Accepted', AcceptedAt = @acceptedAt
        WHERE Id = @id AND (
          (Status = 'Waiting' AND (MentorId IS NULL OR MentorId = @mentorId))
          OR (Status = 'Assigned' AND MentorId = @mentorId)
        );
      `);

    if (!result.rowsAffected[0]) {
      return NextResponse.json({ error: "Session not found or already accepted." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, status: "Accepted" });
  } catch (error) {
    console.error("Accept session failed:", error);
    return NextResponse.json({ error: "Unable to accept session." }, { status: 500 });
  }
}
