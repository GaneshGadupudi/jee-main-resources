import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import {
  createWrittenSolutionRequest,
  getStudentWrittenSolutions,
} from "@/lib/written-solutions-db";
import { saveQuestionImage } from "@/lib/solutions-storage";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
    }

    const studentId = Number(session.sub);
    const solutions = await getStudentWrittenSolutions(studentId);

    return NextResponse.json({ requests: solutions });
  } catch (error) {
    console.error("Failed to load student written solutions:", error);
    return NextResponse.json(
      { error: "Unable to load written solutions." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
    }

    const studentId = Number(session.sub);
    const contentType = request.headers.get("content-type") || "";

    let subject = "";
    let chapter = "";
    let questionText = "";
    let questionImageUrl = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      subject = formData.get("subject")?.toString() || "";
      chapter = formData.get("chapter")?.toString() || "";
      questionText = formData.get("questionText")?.toString() || "";

      const file = formData.get("photo");
      if (file && typeof file === "object" && file.size > 0) {
        const saved = await saveQuestionImage(file, `req_${Date.now()}`);
        questionImageUrl = saved.fileName;
      }
    } else {
      const body = await request.json().catch(() => ({}));
      subject = body.subject || "";
      chapter = body.chapter || "";
      questionText = body.questionText || "";
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }

    if (!questionText || !questionText.trim()) {
      return NextResponse.json(
        { error: "Please enter your question text or description." },
        { status: 400 }
      );
    }

    const newRequest = await createWrittenSolutionRequest({
      studentId,
      subject,
      chapter,
      questionText,
      questionImageUrl,
    });

    return NextResponse.json({
      success: true,
      message: "Your question has been submitted for a mentor written solution.",
      request: newRequest,
    });
  } catch (error) {
    console.error("Failed to submit written solution request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit written solution request." },
      { status: 500 }
    );
  }
}

