import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getMentorWrittenSolutions } from "@/lib/written-solutions-db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
    }
    if (session.role !== "mentor" && session.role !== "admin") {
      return NextResponse.json({ error: "Mentor account required." }, { status: 403 });
    }

    const mentorId = Number(session.sub);
    const data = await getMentorWrittenSolutions(mentorId);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to load mentor written solutions:", error);
    return NextResponse.json(
      { error: "Unable to load written solutions queue." },
      { status: 500 }
    );
  }
}

