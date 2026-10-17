import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { listQuestions } from "@/lib/pyq-db";

// Published questions only, and WITHOUT the answer - answers are returned by /api/pyq/attempt after the student responds.
export async function GET(request) {
  try {
    if (!(await getSession())) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
    const p = new URL(request.url).searchParams;
    const num = (key) => Number(p.get(key)) || undefined;
    const { total, questions } = await listQuestions({
      status: "Published", subjectId: num("subject"), chapterId: num("chapter"), topicId: num("topic"), year: num("year"),
      exam: p.get("exam") || undefined, page: num("page") || 1, pageSize: 20, includeAnswer: false,
    });
    return NextResponse.json({ total, questions });
  } catch (error) {
    console.error("PYQ list failed:", error);
    return NextResponse.json({ error: "Unable to load questions." }, { status: 500 });
  }
}
