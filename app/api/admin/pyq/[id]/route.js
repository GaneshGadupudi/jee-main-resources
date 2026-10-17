import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin";
import { getQuestion, saveQuestion, setStatus } from "@/lib/pyq-db";
import { validateQuestion } from "@/lib/pyq-validate";

const forbidden = () => NextResponse.json({ error: "Admin access required." }, { status: 403 });

// Edit a question. Editing always sends a published question back to Draft so changes are re-reviewed.
export async function PUT(request, { params }) {
  try {
    if (!(await getAdmin())) return forbidden();
    const id = Number((await params).id);
    const { question } = await request.json();
    if (!(await getQuestion(id))) return NextResponse.json({ error: "Question not found." }, { status: 404 });
    await saveQuestion({ ...question, id }, "Draft");
    const saved = await getQuestion(id);
    return NextResponse.json({ question: { ...saved, problems: validateQuestion(saved) } });
  } catch (error) {
    console.error("Admin PYQ save failed:", error);
    return NextResponse.json({ error: "Unable to save the question." }, { status: 500 });
  }
}

// body { action: "publish" | "reject" | "draft" }
export async function POST(request, { params }) {
  try {
    const admin = await getAdmin();
    if (!admin) return forbidden();
    const id = Number((await params).id);
    const { action } = await request.json();
    const question = await getQuestion(id);
    if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });
    if (action === "publish") {
      const problems = validateQuestion(question);
      if (problems.length) return NextResponse.json({ error: "Fix these problems before publishing.", problems }, { status: 422 });
      await setStatus(id, "Published", admin.id);
    } else if (action === "reject") await setStatus(id, "Rejected", admin.id);
    else if (action === "draft") await setStatus(id, "Draft", admin.id);
    else return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin PYQ action failed:", error);
    return NextResponse.json({ error: "Unable to update the question." }, { status: 500 });
  }
}
