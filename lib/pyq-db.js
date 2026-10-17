import { getDb, sql } from "@/lib/db";

const QUESTION_COLUMNS = `q.Id, q.TopicId, q.Exam, q.[Year] AS Year, q.Shift, q.SourceQuestionId, q.QuestionType, q.QuestionText, q.QuestionImageUrl,
  q.CorrectNumeric, q.Explanation, q.SourceFile, q.SourcePage, q.Status, q.ReviewedAt,
  t.Name AS TopicName, c.Name AS ChapterName, s.Name AS SubjectName, s.Id AS SubjectId, c.Id AS ChapterId`;
const QUESTION_JOINS = `FROM dbo.PyqQuestions q
  LEFT JOIN dbo.PyqTopics t ON t.Id = q.TopicId LEFT JOIN dbo.PyqChapters c ON c.Id = t.ChapterId LEFT JOIN dbo.PyqSubjects s ON s.Id = c.SubjectId`;

export function toQuestion(row, options = [], { includeAnswer = true } = {}) {
  const sorted = options.filter((o) => Number(o.QuestionId) === Number(row.Id)).sort((a, b) => a.OptionIndex - b.OptionIndex);
  const num = (v) => (v === null || v === undefined ? null : Number(v)); // the SQL driver can return INT columns as strings
  const question = {
    id: Number(row.Id), exam: row.Exam, year: Number(row.Year), shift: row.Shift, sourceQuestionId: row.SourceQuestionId, type: row.QuestionType,
    text: row.QuestionText, imageUrl: row.QuestionImageUrl, options: sorted.map((o) => o.OptionText),
    subject: row.SubjectName, chapter: row.ChapterName, topic: row.TopicName, subjectId: num(row.SubjectId), chapterId: num(row.ChapterId), topicId: num(row.TopicId),
  };
  if (includeAnswer) Object.assign(question, {
    correct: sorted.filter((o) => o.IsCorrect).map((o) => Number(o.OptionIndex)),
    numericAnswer: row.CorrectNumeric === null ? null : Number(row.CorrectNumeric),
    explanation: row.Explanation, sourceFile: row.SourceFile, sourcePage: num(row.SourcePage), status: row.Status,
  });
  return question;
}

async function loadOptions(pool, ids) {
  if (!ids.length) return [];
  const result = await pool.request().query(`SELECT QuestionId, OptionIndex, OptionText, IsCorrect FROM dbo.PyqOptions WHERE QuestionId IN (${ids.map(Number).join(",")})`);
  return result.recordset;
}

export async function listQuestions({ status, topicId, subjectId, chapterId, exam, year, includeAnswer, page = 1, pageSize = 20 }) {
  const pool = await getDb();
  const request = pool.request();
  const where = [];
  if (status) { request.input("status", sql.VarChar(10), status); where.push("q.Status = @status"); }
  if (subjectId) { request.input("subjectId", sql.Int, subjectId); where.push("s.Id = @subjectId"); }
  if (chapterId) { request.input("chapterId", sql.Int, chapterId); where.push("c.Id = @chapterId"); }
  if (topicId) { request.input("topicId", sql.Int, topicId); where.push("q.TopicId = @topicId"); }
  if (exam) { request.input("exam", sql.NVarChar(30), exam); where.push("q.Exam = @exam"); }
  if (year) { request.input("year", sql.SmallInt, year); where.push("q.[Year] = @year"); }
  request.input("offset", sql.Int, (page - 1) * pageSize).input("size", sql.Int, pageSize);
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const result = await request.query(`SELECT ${QUESTION_COLUMNS}, COUNT(*) OVER() AS Total ${QUESTION_JOINS} ${clause} ORDER BY q.[Year] DESC, q.Id OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`);
  const options = await loadOptions(pool, result.recordset.map((r) => r.Id));
  return { total: Number(result.recordset[0]?.Total ?? 0), questions: result.recordset.map((r) => toQuestion(r, options, { includeAnswer })) };
}

export async function getQuestion(id, { includeAnswer = true } = {}) {
  const pool = await getDb();
  const result = await pool.request().input("id", sql.Int, id).query(`SELECT ${QUESTION_COLUMNS} ${QUESTION_JOINS} WHERE q.Id = @id`);
  if (!result.recordset[0]) return null;
  return toQuestion(result.recordset[0], await loadOptions(pool, [id]), { includeAnswer });
}

// Insert (no id) or update (id) a question together with its options, atomically.
export async function saveQuestion(q, status = "Draft") {
  const pool = await getDb();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const req = () => new sql.Request(tx);
    const fill = (r) => r.input("topicId", sql.Int, q.topicId || null).input("exam", sql.NVarChar(30), q.exam).input("year", sql.SmallInt, q.year)
      .input("shift", sql.NVarChar(60), q.shift || null).input("srcId", sql.NVarChar(40), q.sourceQuestionId || null).input("type", sql.VarChar(10), q.type)
      .input("text", sql.NVarChar(sql.MAX), q.text).input("img", sql.NVarChar(500), q.imageUrl || null)
      .input("num", sql.Decimal(18, 4), q.type === "NUMERIC" ? Number(q.numericAnswer) : null).input("expl", sql.NVarChar(sql.MAX), q.explanation || null)
      .input("file", sql.NVarChar(260), q.sourceFile || null).input("page", sql.Int, q.sourcePage || null).input("status", sql.VarChar(10), status);
    let id = q.id;
    if (id) {
      await fill(req().input("id", sql.Int, id)).query(`UPDATE dbo.PyqQuestions SET TopicId=@topicId, Exam=@exam, [Year]=@year, Shift=@shift, SourceQuestionId=@srcId, QuestionType=@type,
        QuestionText=@text, QuestionImageUrl=@img, CorrectNumeric=@num, Explanation=@expl, SourceFile=@file, SourcePage=@page, Status=@status, UpdatedAt=SYSUTCDATETIME() WHERE Id=@id`);
      await req().input("id", sql.Int, id).query("DELETE FROM dbo.PyqOptions WHERE QuestionId = @id");
    } else {
      const r = await fill(req()).query(`INSERT INTO dbo.PyqQuestions (TopicId, Exam, [Year], Shift, SourceQuestionId, QuestionType, QuestionText, QuestionImageUrl, CorrectNumeric, Explanation, SourceFile, SourcePage, Status)
        OUTPUT INSERTED.Id VALUES (@topicId, @exam, @year, @shift, @srcId, @type, @text, @img, @num, @expl, @file, @page, @status)`);
      id = Number(r.recordset[0].Id);
    }
    for (const [index, text] of (q.options || []).entries()) {
      await req().input("qid", sql.Int, id).input("idx", sql.TinyInt, index).input("text", sql.NVarChar(sql.MAX), String(text).trim()).input("ok", sql.Bit, (q.correct || []).includes(index) ? 1 : 0)
        .query("INSERT INTO dbo.PyqOptions (QuestionId, OptionIndex, OptionText, IsCorrect) VALUES (@qid, @idx, @text, @ok)");
    }
    await tx.commit();
    return id;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

export async function setStatus(id, status, adminId) {
  const pool = await getDb();
  await pool.request().input("id", sql.Int, id).input("status", sql.VarChar(10), status).input("by", sql.Int, adminId)
    .query("UPDATE dbo.PyqQuestions SET Status=@status, ReviewedBy=@by, ReviewedAt=SYSUTCDATETIME(), UpdatedAt=SYSUTCDATETIME() WHERE Id=@id");
}

export async function getTaxonomy() {
  const pool = await getDb();
  const r = await pool.request().query(`SELECT s.Id AS SubjectId, s.Name AS Subject, c.Id AS ChapterId, c.Name AS Chapter, t.Id AS TopicId, t.Name AS Topic
    FROM dbo.PyqSubjects s JOIN dbo.PyqChapters c ON c.SubjectId = s.Id JOIN dbo.PyqTopics t ON t.ChapterId = c.Id ORDER BY s.Id, c.Id, t.Id`);
  const subjects = [];
  for (const raw of r.recordset) {
    const row = { ...raw, SubjectId: Number(raw.SubjectId), ChapterId: Number(raw.ChapterId), TopicId: Number(raw.TopicId) };
    let s = subjects.find((x) => x.id === row.SubjectId) || (subjects.push({ id: row.SubjectId, name: row.Subject, chapters: [] }), subjects.at(-1));
    let c = s.chapters.find((x) => x.id === row.ChapterId) || (s.chapters.push({ id: row.ChapterId, name: row.Chapter, topics: [] }), s.chapters.at(-1));
    c.topics.push({ id: row.TopicId, name: row.Topic });
  }
  return subjects;
}
