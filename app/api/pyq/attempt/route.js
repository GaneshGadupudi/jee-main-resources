import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getQuestion } from "@/lib/pyq-db";
import { getDb, sql } from "@/lib/db";

// body { questionId, answer } - answer is an option index, an array of indexes (MULTI) or a number (NUMERIC).
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
    const { questionId, answer } = await request.json();
    const question = await getQuestion(Number(questionId));
    if (!question || question.status !== "Published") return NextResponse.json({ error: "Question not found." }, { status: 404 });

    let isCorrect;
    if (question.type === "NUMERIC") isCorrect = Math.abs(Number(answer) - question.numericAnswer) < 0.01;
    else {
      const chosen = [].concat(answer).map(Number).sort();
      const expected = [...question.correct].sort();
      isCorrect = chosen.length === expected.length && chosen.every((v, i) => v === expected[i]);
    }
    const pool = await getDb();
    await pool.request().input("user", sql.Int, Number(session.sub)).input("q", sql.Int, question.id)
      .input("answer", sql.NVarChar(100), [].concat(answer).join(",")).input("ok", sql.Bit, isCorrect ? 1 : 0)
      .query("INSERT INTO dbo.PyqAttempts (UserId, QuestionId, Answer, IsCorrect) VALUES (@user, @q, @answer, @ok)");
    return NextResponse.json({ isCorrect, correct: question.correct, numericAnswer: question.numericAnswer, explanation: question.explanation });
  } catch (error) {
    console.error("PYQ attempt failed:", error);
    return NextResponse.json({ error: "Unable to record your answer." }, { status: 500 });
  }
}
