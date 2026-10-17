import { NextResponse } from "next/server";
import { getDb, sql } from "@/lib/db";
import { getSession } from "@/lib/auth-server";

function splitList(value) {
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

function responseProfile(row) {
  if (!row) return null;
  return {
    target: row.TargetExam,
    date: row.ExamDate.toISOString().slice(0, 10),
    stage: row.PreparationStage,
    hours: row.DailyHours,
    exams: splitList(row.Exams),
    strengths: splitList(row.Strengths),
    focus: splitList(row.FocusSubjects),
    goal: row.Goal || "",
    goalPercentile: row.GoalPercentile == null ? null : Number(row.GoalPercentile),
  };
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
    const pool = await getDb();
    const result = await pool.request().input("userId", sql.Int, Number(session.sub))
      .query("SELECT TOP (1) TargetExam, ExamDate, PreparationStage, DailyHours, Exams, Strengths, FocusSubjects, Goal, GoalPercentile FROM dbo.UserPreferences WHERE UserId = @userId");
    return NextResponse.json({ preferences: responseProfile(result.recordset[0]) });
  } catch (error) {
    console.error("Preferences lookup failed:", error);
    return NextResponse.json({ error: "Unable to load your preferences." }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
    const body = await request.json();
    const exams = Array.isArray(body.exams) ? body.exams : [];
    if (!body.target || !body.date || !body.stage || !body.hours || !exams.length) {
      return NextResponse.json({ error: "Complete the required preference fields." }, { status: 400 });
    }
    const goalPercentile = body.goalPercentile == null ? null : Number(body.goalPercentile);
    if (goalPercentile != null && (!Number.isFinite(goalPercentile) || goalPercentile < 50 || goalPercentile > 99)) {
      return NextResponse.json({ error: "Target percentile must be between 50 and 99." }, { status: 400 });
    }
    const pool = await getDb();
    await pool.request()
      .input("userId", sql.Int, Number(session.sub))
      .input("targetExam", sql.NVarChar(100), body.target)
      .input("examDate", sql.Date, body.date)
      .input("stage", sql.NVarChar(100), body.stage)
      .input("hours", sql.NVarChar(50), body.hours)
      .input("exams", sql.NVarChar(500), exams.join(", "))
      .input("strengths", sql.NVarChar(500), Array.isArray(body.strengths) ? body.strengths.join(", ") : "")
      .input("focus", sql.NVarChar(500), Array.isArray(body.focus) ? body.focus.join(", ") : "")
      .input("goal", sql.NVarChar(1000), body.goal || "")
      .input("goalPercentile", sql.TinyInt, goalPercentile)
      .query(`
        MERGE dbo.UserPreferences AS target
        USING (SELECT @userId AS UserId) AS source ON target.UserId = source.UserId
        WHEN MATCHED THEN UPDATE SET TargetExam = @targetExam, ExamDate = @examDate, PreparationStage = @stage,
          DailyHours = @hours, Exams = @exams, Strengths = @strengths, FocusSubjects = @focus, Goal = @goal,
          GoalPercentile = @goalPercentile, UpdatedAt = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN INSERT (UserId, TargetExam, ExamDate, PreparationStage, DailyHours, Exams, Strengths, FocusSubjects, Goal, GoalPercentile)
          VALUES (@userId, @targetExam, @examDate, @stage, @hours, @exams, @strengths, @focus, @goal, @goalPercentile);
      `);
    return NextResponse.json({ preferences: { ...body, exams, goalPercentile } });
  } catch (error) {
    console.error("Preferences save failed:", error);
    return NextResponse.json({ error: "Unable to save your preferences." }, { status: 500 });
  }
}
