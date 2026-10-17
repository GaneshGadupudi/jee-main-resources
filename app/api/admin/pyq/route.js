import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin";
import { getTaxonomy, listQuestions, saveQuestion } from "@/lib/pyq-db";
import { validateQuestion } from "@/lib/pyq-validate";
import { getDb } from "@/lib/db";

const forbidden = () => NextResponse.json({ error: "Admin access required." }, { status: 403 });

export async function GET(request) {
  try {
    if (!(await getAdmin())) return forbidden();
    const params = new URL(request.url).searchParams;
    const status = params.get("status") || "Draft";
    const { total, questions } = await listQuestions({ status, page: Number(params.get("page")) || 1, pageSize: 20, includeAnswer: true });
    const pool = await getDb();
    const counts = (await pool.request().query("SELECT Status, COUNT(*) AS N FROM dbo.PyqQuestions GROUP BY Status")).recordset;
    return NextResponse.json({
      total, counts: Object.fromEntries(counts.map((c) => [c.Status, Number(c.N)])), taxonomy: await getTaxonomy(),
      questions: questions.map((q) => ({ ...q, problems: validateQuestion(q) })),
    });
  } catch (error) {
    console.error("Admin PYQ list failed:", error);
    return NextResponse.json({ error: "Unable to load questions." }, { status: 500 });
  }
}

// Bulk import: body { questions: [...] }. Everything lands as Draft; nothing is visible to students until the admin publishes it.
// A question may give topicId, or subject + chapter + topic names which are resolved here.
export async function POST(request) {
  try {
    if (!(await getAdmin())) return forbidden();
    const { questions } = await request.json();
    if (!Array.isArray(questions) || !questions.length) return NextResponse.json({ error: "Provide a non-empty 'questions' array." }, { status: 400 });
    const taxonomy = await getTaxonomy();
    const norm = (s) => String(s || "").trim().toLowerCase();
    const results = [];
    for (const [index, raw] of questions.entries()) {
      const q = { ...raw };
      if (!q.topicId && q.subject && q.chapter && q.topic) {
        const chapter = taxonomy.find((s) => norm(s.name) === norm(q.subject))?.chapters.find((c) => norm(c.name) === norm(q.chapter));
        q.topicId = chapter?.topics.find((t) => norm(t.name) === norm(q.topic))?.id;
      }
      try {
        const id = await saveQuestion({ ...q, id: undefined }, "Draft");
        results.push({ index, id, problems: validateQuestion(q) });
      } catch (error) {
        const duplicate = /UX_PyqQuestions_Source|duplicate key/i.test(error.message);
        results.push({ index, error: duplicate ? "Duplicate: this official question was already imported." : error.message });
      }
    }
    return NextResponse.json({ imported: results.filter((r) => r.id).length, results });
  } catch (error) {
    console.error("Admin PYQ import failed:", error);
    return NextResponse.json({ error: "Import failed." }, { status: 500 });
  }
}
