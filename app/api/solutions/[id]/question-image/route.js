import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getWrittenSolutionById } from "@/lib/written-solutions-db";
import { getQuestionImageBuffer } from "@/lib/solutions-storage";

export async function GET(request, context) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { id } = await context.params;
    const solution = await getWrittenSolutionById(id);

    if (!solution || !solution.QuestionImageUrl) {
      return NextResponse.json({ error: "Question photo not found." }, { status: 404 });
    }

    const fileData = await getQuestionImageBuffer(solution.QuestionImageUrl);
    if (!fileData) {
      return NextResponse.json(
        { error: "Question image file is missing or has been removed." },
        { status: 404 }
      );
    }

    return new Response(fileData.buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(fileData.buffer.length),
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": 'inline; filename="question.jpg"',
      },
    });
  } catch (error) {
    console.error("Failed to stream question image:", error);
    return NextResponse.json(
      { error: "Unable to retrieve question photo." },
      { status: 500 }
    );
  }
}

