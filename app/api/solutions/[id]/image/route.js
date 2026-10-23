import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getWrittenSolutionById } from "@/lib/written-solutions-db";
import { getSolutionImageBuffer } from "@/lib/solutions-storage";

export async function GET(request, context) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { id } = await context.params;
    const solution = await getWrittenSolutionById(id);

    if (!solution || !solution.SolutionImageFileName) {
      return NextResponse.json({ error: "Solution photo not found." }, { status: 404 });
    }

    const currentUserId = Number(session.sub);
    const isStudent = solution.StudentId === currentUserId;
    const isMentor = solution.MentorId === currentUserId;
    const isAdmin = session.role === "admin";

    if (!isStudent && !isMentor && !isAdmin) {
      return NextResponse.json(
        { error: "Access denied. Only the requesting student and mentor can view this solution." },
        { status: 403 }
      );
    }

    // Check 30-day expiration
    if (solution.ExpiresAt && new Date(solution.ExpiresAt).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "This solution has expired under the 30-day retention policy." },
        { status: 410 }
      );
    }

    const fileData = await getSolutionImageBuffer(solution.SolutionImageFileName);
    if (!fileData) {
      return NextResponse.json(
        { error: "Solution image file is missing or has been removed." },
        { status: 404 }
      );
    }

    const mimeType = solution.SolutionImageMimeType || "image/jpeg";

    return new Response(fileData.buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(fileData.buffer.length),
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename="${solution.SolutionImageOriginalName || "solution.jpg"}"`,
      },
    });
  } catch (error) {
    console.error("Failed to stream solution image:", error);
    return NextResponse.json(
      { error: "Unable to retrieve solution photo." },
      { status: 500 }
    );
  }
}

