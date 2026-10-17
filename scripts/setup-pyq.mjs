// Usage: node --env-file=.env.local scripts/setup-pyq.mjs
// Creates the PYQ tables (idempotent), seeds the subject/chapter/topic tree from lib/pyq.js,
// and imports the old hard-coded sample questions as DRAFTS (they are unverified, so they need admin review).
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pyqSubjects } from "../lib/pyq.js";

// Same connection settings as lib/db.js (that file relies on Next's module resolution, so it can't be imported from plain Node).
const sql = createRequire(import.meta.url)("mssql/msnodesqlv8");
const pool = await sql.connect({
  server: process.env.MSSQL_SERVER || "localhost",
  database: process.env.MSSQL_DATABASE || "JEE_Preparation_Platform",
  driver: process.env.MSSQL_ODBC_DRIVER || "ODBC Driver 18 for SQL Server",
  options: { trustedConnection: true, encrypt: false, instanceName: process.env.MSSQL_INSTANCE || "SQLEXPRESS" },
});
await pool.request().batch(await readFile(new URL("../database/PYQ.sql", import.meta.url), "utf8"));
console.log("Tables ready.");

async function upsert(table, where, params, insertCols, insertVals) {
  const request = pool.request();
  for (const [name, type, value] of params) request.input(name, type, value);
  const found = await request.query(`SELECT Id FROM dbo.${table} WHERE ${where}`);
  if (found.recordset[0]) return found.recordset[0].Id;
  const inserted = await request.query(`INSERT INTO dbo.${table} (${insertCols}) OUTPUT INSERTED.Id VALUES (${insertVals})`);
  return inserted.recordset[0].Id;
}

let imported = 0;
for (const subject of pyqSubjects) {
  const subjectId = await upsert("PyqSubjects", "Slug = @slug", [["slug", sql.VarChar(60), subject.id], ["name", sql.NVarChar(100), subject.name]], "Slug, Name", "@slug, @name");
  for (const chapter of subject.chapters) {
    const chapterId = await upsert("PyqChapters", "SubjectId = @sid AND Slug = @slug", [["sid", sql.Int, subjectId], ["slug", sql.VarChar(80), chapter.id], ["name", sql.NVarChar(150), chapter.name]], "SubjectId, Slug, Name", "@sid, @slug, @name");
    for (const topic of chapter.topics) {
      const topicId = await upsert("PyqTopics", "ChapterId = @cid AND Slug = @slug", [["cid", sql.Int, chapterId], ["slug", sql.VarChar(80), topic.id], ["name", sql.NVarChar(150), topic.name]], "ChapterId, Slug, Name", "@cid, @slug, @name");
      for (const q of topic.questions) {
        const exists = await pool.request().input("t", sql.NVarChar(sql.MAX), q.text).query("SELECT 1 AS x FROM dbo.PyqQuestions WHERE QuestionText = @t");
        if (exists.recordset[0]) continue;
        const inserted = await pool.request().input("topic", sql.Int, topicId).input("exam", sql.NVarChar(30), q.exam).input("year", sql.SmallInt, q.year)
          .input("text", sql.NVarChar(sql.MAX), q.text).input("expl", sql.NVarChar(sql.MAX), q.explanation)
          .query("INSERT INTO dbo.PyqQuestions (TopicId, Exam, [Year], QuestionType, QuestionText, Explanation, Status) OUTPUT INSERTED.Id VALUES (@topic, @exam, @year, 'MCQ', @text, @expl, 'Draft')");
        for (const [index, text] of q.options.entries()) {
          await pool.request().input("q", sql.Int, inserted.recordset[0].Id).input("i", sql.TinyInt, index).input("t", sql.NVarChar(sql.MAX), text).input("ok", sql.Bit, index === q.answer ? 1 : 0)
            .query("INSERT INTO dbo.PyqOptions (QuestionId, OptionIndex, OptionText, IsCorrect) VALUES (@q, @i, @t, @ok)");
        }
        imported++;
      }
    }
  }
}
console.log(`Taxonomy seeded. ${imported} sample question(s) imported as Draft.`);
await pool.close();
