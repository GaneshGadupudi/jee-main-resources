import { getDb, sql } from "@/lib/db";
import { HttpError } from "@/lib/api-user";

// All per-student data that used to live in the browser's localStorage. Every function takes the logged-in userId.
// Shapes returned by getState() deliberately match what the dashboard components already used, so the UI barely changes.

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const day = (value) => (typeof value === "string" && DAY.test(value) ? value : null);
const text = (value, max) => (value === null || value === undefined ? null : String(value).slice(0, max));
const num = (value) => (value === null || value === undefined ? null : Number(value));
const toDate = (param) => `DATEADD(MILLISECOND, CAST(${param} % 1000 AS INT), DATEADD(SECOND, CAST(${param} / 1000 AS INT), CAST('1970-01-01' AS DATETIME2(3))))`;
const toMs = (column) => `DATEDIFF_BIG(MILLISECOND, '1970-01-01', ${column})`;
const TEST_TYPES = ["contest", "mock"];
const SOURCES = ["daily", "plan", "mock", "contest"];
const TASK_TYPES = ["chapter", "mistakes", "routine"];

function checkType(type) {
  if (!TEST_TYPES.includes(type)) throw new HttpError(400, "Unknown test type.");
  return type;
}

async function inTransaction(work) {
  const pool = await getDb();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const result = await work(() => new sql.Request(tx));
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

// ---------------------------------------------------------------- load everything

export async function getState(userId, { today, contestKey }) {
  const pool = await getDb();
  const q = (query, params = {}) => {
    const request = pool.request().input("u", sql.Int, userId);
    for (const [name, [type, value]] of Object.entries(params)) request.input(name, type, value);
    return request.query(query).then((r) => r.recordset);
  };
  const todayParam = { today: [sql.NVarChar(10), day(today) || "1970-01-01"] };

  const [planRows, taskRows, doneRows, chapterRows, answerRows, mistakeRows, attemptRows, testAnswerRows, registration, readRows, settings, mentorRows] = await Promise.all([
    q("SELECT Signature FROM dbo.StudyPlans WHERE UserId = @u AND PlanDate = CAST(@today AS DATE)", todayParam),
    q(`SELECT t.TaskKey, t.TaskType, t.Title, t.Subject, t.ChapterKey, t.Chapter, t.[File] AS [File], t.Weight, t.Minutes, t.IsCompleted, t.ScoreCorrect, t.ScoreTotal
       FROM dbo.StudyPlanTasks t JOIN dbo.StudyPlans p ON p.Id = t.PlanId WHERE p.UserId = @u AND p.PlanDate = CAST(@today AS DATE) ORDER BY t.SortOrder`, todayParam),
    q(`SELECT CONVERT(CHAR(10), p.PlanDate, 23) AS d, t.TaskKey AS id, t.Minutes AS m FROM dbo.StudyPlanTasks t JOIN dbo.StudyPlans p ON p.Id = t.PlanId
       WHERE p.UserId = @u AND t.IsCompleted = 1 ORDER BY p.PlanDate, t.SortOrder`),
    q("SELECT ChapterKey FROM dbo.ChapterProgress WHERE UserId = @u ORDER BY CompletedAt"),
    q(`SELECT * FROM (SELECT TOP (3000) Id, CONVERT(CHAR(10), AnsweredOn, 23) AS d, Source AS src, Subject AS s, Chapter AS c, QuestionText AS q, IsCorrect AS ok
       FROM dbo.PracticeAnswers WHERE UserId = @u ORDER BY Id DESC) latest ORDER BY Id`),
    q("SELECT Subject, Chapter, QuestionText, OptionsJson, CorrectOption, Explanation, Reason, IsRevisited FROM dbo.MistakeBook WHERE UserId = @u ORDER BY Id"),
    q(`SELECT Id, TestType, TestKey, Title, IsVirtual, Status, ${toMs("StartedAt")} AS startedAt, ${toMs("EndsAt")} AS endsAt, ${toMs("SubmittedAt")} AS submittedAt,
       CONVERT(CHAR(10), SubmittedOn, 23) AS submittedOn, CurrentIndex, TimeTakenMs, TotalQuestions, Correct, Wrong, Skipped, Score, Accuracy
       FROM dbo.TestAttempts WHERE UserId = @u ORDER BY ISNULL(SubmittedAt, StartedAt) DESC, Id DESC`),
    q(`SELECT a.AttemptId, a.QuestionIndex, a.SelectedOption, a.IsMarked, a.TimeSpentMs FROM dbo.TestAttemptAnswers a
       JOIN dbo.TestAttempts t ON t.Id = a.AttemptId WHERE t.UserId = @u`),
    contestKey ? q("SELECT 1 AS x FROM dbo.ContestRegistrations WHERE UserId = @u AND ContestKey = @key", { key: [sql.NVarChar(100), String(contestKey)] }) : Promise.resolve([]),
    q(`SELECT NotificationKey, ${toMs("ReadAt")} AS readAt FROM dbo.NotificationReads WHERE UserId = @u`),
    q("SELECT Theme FROM dbo.UserSettings WHERE UserId = @u"),
    q("SELECT TOP (1) Status, AssignedTo FROM dbo.MentorRequests WHERE UserId = @u ORDER BY Id DESC"),
  ]);

  const plan = planRows[0] ? {
    date: today, signature: planRows[0].Signature,
    tasks: taskRows.map((t) => ({
      id: t.TaskKey, type: t.TaskType, title: t.Title, minutes: t.Minutes,
      ...(t.Subject && { subject: t.Subject }), ...(t.ChapterKey && { chapterId: t.ChapterKey }), ...(t.Chapter && { chapter: t.Chapter }),
      ...(t.File && { file: t.File }), ...(t.Weight !== null && { weight: Number(t.Weight) }),
    })),
  } : null;

  const answersByAttempt = new Map();
  for (const row of testAnswerRows) {
    const id = Number(row.AttemptId);
    if (!answersByAttempt.has(id)) answersByAttempt.set(id, []);
    answersByAttempt.get(id).push(row);
  }

  const histories = { contest: [], mock: [] };
  const active = { contest: null, mock: null };
  const timeLog = [];
  for (const attempt of attemptRows) {
    const rows = answersByAttempt.get(Number(attempt.Id)) || [];
    if (attempt.Status === "Submitted") {
      const total = Number(attempt.TotalQuestions);
      const answers = Array(total).fill(null);
      const spent = Array(total).fill(0);
      for (const row of rows) {
        if (row.QuestionIndex >= total) continue;
        answers[row.QuestionIndex] = row.SelectedOption;
        spent[row.QuestionIndex] = Math.round(row.TimeSpentMs / 1000);
      }
      const at = Number(attempt.submittedAt);
      histories[attempt.TestType].push({
        id: `${attempt.TestKey}@${at}`, contestId: attempt.TestKey, title: attempt.Title, virtual: !!attempt.IsVirtual, at, timeTaken: Number(attempt.TimeTakenMs),
        answers, spent, total, correct: attempt.Correct, wrong: attempt.Wrong, skipped: attempt.Skipped, score: attempt.Score, accuracy: attempt.Accuracy,
      });
      if (attempt.submittedOn) timeLog.push({ d: attempt.submittedOn, m: Math.max(1, Math.round(Number(attempt.TimeTakenMs) / 60000)) });
    } else if (!active[attempt.TestType]) {
      active[attempt.TestType] = {
        contestId: attempt.TestKey, startedAt: Number(attempt.startedAt), endsAt: Number(attempt.endsAt), current: attempt.CurrentIndex,
        answers: Object.fromEntries(rows.filter((r) => r.SelectedOption !== null).map((r) => [r.QuestionIndex, r.SelectedOption])),
        marked: rows.filter((r) => r.IsMarked).map((r) => r.QuestionIndex),
        spent: Object.fromEntries(rows.filter((r) => r.TimeSpentMs > 0).map((r) => [r.QuestionIndex, r.TimeSpentMs])),
      };
    }
  }

  return {
    plan,
    completed: plan ? taskRows.filter((t) => t.IsCompleted).map((t) => t.TaskKey) : [],
    scores: Object.fromEntries(taskRows.filter((t) => t.ScoreTotal !== null).map((t) => [t.TaskKey, { correct: t.ScoreCorrect, total: t.ScoreTotal }])),
    doneLog: doneRows.map((r) => ({ d: r.d, id: r.id, m: r.m })),
    chapterHistory: chapterRows.map((r) => r.ChapterKey),
    answers: answerRows.map((r) => ({ d: r.d, src: r.src, s: r.s, c: r.c, q: r.q, ok: !!r.ok })),
    mistakes: mistakeRows.map((r) => ({
      subject: r.Subject, chapter: r.Chapter, text: r.QuestionText, options: JSON.parse(r.OptionsJson), answer: r.CorrectOption,
      explanation: r.Explanation || "", reason: r.Reason || "", revisited: !!r.IsRevisited,
    })),
    timeLog, histories, active,
    registered: registration.length > 0,
    notificationReads: Object.fromEntries(readRows.map((r) => [r.NotificationKey, { readAt: Number(r.readAt) }])),
    theme: settings[0]?.Theme || null,
    mentor: mentorRows[0] ? { status: mentorRows[0].Status, assignedTo: mentorRows[0].AssignedTo } : null,
  };
}

// ---------------------------------------------------------------- study plan

// Saves today's plan. Tasks already in the plan keep their completion and score; tasks no longer in it are removed.
export async function savePlan(userId, { date, signature, tasks }) {
  if (!day(date) || !Array.isArray(tasks)) throw new HttpError(400, "Invalid plan.");
  const seen = new Set();
  const rows = tasks.filter((t) => t && t.id && TASK_TYPES.includes(t.type) && !seen.has(t.id) && seen.add(t.id)).map((t, index) => ({
    key: text(t.id, 150), ord: index, type: t.type, title: text(t.title, 300), subject: text(t.subject, 50), chapterKey: text(t.chapterId, 150),
    chapter: text(t.chapter, 150), file: text(t.file, 260), weight: num(t.weight), minutes: Number(t.minutes) || 0,
  }));
  await inTransaction(async (request) => {
    const plan = await request().input("u", sql.Int, userId).input("d", sql.NVarChar(10), date).input("sig", sql.NVarChar(500), text(signature, 500) || "").query(`
      MERGE dbo.StudyPlans AS t USING (SELECT @u AS UserId, CAST(@d AS DATE) AS PlanDate) AS s ON t.UserId = s.UserId AND t.PlanDate = s.PlanDate
      WHEN MATCHED THEN UPDATE SET Signature = @sig
      WHEN NOT MATCHED THEN INSERT (UserId, PlanDate, Signature) VALUES (@u, CAST(@d AS DATE), @sig)
      OUTPUT INSERTED.Id;`);
    await request().input("p", sql.Int, plan.recordset[0].Id).input("j", sql.NVarChar(sql.MAX), JSON.stringify(rows)).query(`
      DELETE FROM dbo.StudyPlanTasks WHERE PlanId = @p AND TaskKey NOT IN (SELECT [key] FROM OPENJSON(@j) WITH ([key] NVARCHAR(150) '$.key'));
      MERGE dbo.StudyPlanTasks AS t USING (SELECT * FROM OPENJSON(@j) WITH ([key] NVARCHAR(150) '$.key', ord TINYINT '$.ord', [type] VARCHAR(10) '$.type',
        title NVARCHAR(300) '$.title', subject NVARCHAR(50) '$.subject', chapterKey NVARCHAR(150) '$.chapterKey', chapter NVARCHAR(150) '$.chapter',
        [file] NVARCHAR(260) '$.file', weight DECIMAL(4,2) '$.weight', minutes SMALLINT '$.minutes')) AS s ON t.PlanId = @p AND t.TaskKey = s.[key]
      WHEN MATCHED THEN UPDATE SET SortOrder = s.ord, TaskType = s.[type], Title = s.title, Subject = s.subject, ChapterKey = s.chapterKey, Chapter = s.chapter,
        [File] = s.[file], Weight = s.weight, Minutes = s.minutes
      WHEN NOT MATCHED THEN INSERT (PlanId, TaskKey, SortOrder, TaskType, Title, Subject, ChapterKey, Chapter, [File], Weight, Minutes)
        VALUES (@p, s.[key], s.ord, s.[type], s.title, s.subject, s.chapterKey, s.chapter, s.[file], s.weight, s.minutes);`);
  });
}

// Ticks / unticks a task of today's plan. Finishing a chapter task also records the score and marks the chapter as studied.
export async function setTask(userId, { date, taskKey, completed, score, chapterKey }) {
  if (!day(date) || !taskKey) throw new HttpError(400, "Invalid task.");
  const finished = !!completed;
  const hasScore = score && Number.isFinite(Number(score.total));
  await inTransaction(async (request) => {
    const r = request().input("u", sql.Int, userId).input("d", sql.NVarChar(10), date).input("k", sql.NVarChar(150), String(taskKey)).input("c", sql.Bit, finished ? 1 : 0)
      .input("sc", sql.SmallInt, hasScore ? Number(score.correct) || 0 : null).input("st", sql.SmallInt, hasScore ? Number(score.total) : null);
    const updated = await r.query(`
      UPDATE t SET IsCompleted = @c, CompletedAt = CASE WHEN @c = 0 THEN NULL WHEN t.IsCompleted = 0 THEN SYSUTCDATETIME() ELSE t.CompletedAt END,
        ScoreCorrect = CASE WHEN @st IS NOT NULL THEN @sc ELSE t.ScoreCorrect END, ScoreTotal = CASE WHEN @st IS NOT NULL THEN @st ELSE t.ScoreTotal END
      FROM dbo.StudyPlanTasks t JOIN dbo.StudyPlans p ON p.Id = t.PlanId WHERE p.UserId = @u AND p.PlanDate = CAST(@d AS DATE) AND t.TaskKey = @k`);
    if (!updated.rowsAffected[0]) throw new HttpError(404, "That task is not in today's plan.");
    if (finished && chapterKey) {
      await request().input("u", sql.Int, userId).input("ch", sql.NVarChar(150), String(chapterKey)).query(
        "IF NOT EXISTS (SELECT 1 FROM dbo.ChapterProgress WHERE UserId = @u AND ChapterKey = @ch) INSERT INTO dbo.ChapterProgress (UserId, ChapterKey) VALUES (@u, @ch)");
    }
  });
}

// ---------------------------------------------------------------- practice answers + mistake book

export async function addAnswers(userId, answers) {
  const rows = (Array.isArray(answers) ? answers : []).filter((a) => a && day(a.d) && SOURCES.includes(a.src) && a.q).slice(0, 500)
    .map((a) => ({ d: a.d, src: a.src, s: text(a.s, 50) || "", c: text(a.c, 150) || "", q: text(a.q, 1000), ok: a.ok ? 1 : 0 }));
  if (!rows.length) return;
  const pool = await getDb();
  await pool.request().input("u", sql.Int, userId).input("j", sql.NVarChar(sql.MAX), JSON.stringify(rows)).query(`
    INSERT INTO dbo.PracticeAnswers (UserId, AnsweredOn, Source, Subject, Chapter, QuestionText, IsCorrect)
    SELECT @u, CAST(d AS DATE), src, s, c, q, ok FROM OPENJSON(@j) WITH (d NVARCHAR(10) '$.d', src VARCHAR(10) '$.src', s NVARCHAR(50) '$.s',
      c NVARCHAR(150) '$.c', q NVARCHAR(1000) '$.q', ok BIT '$.ok')`);
}

// Adds questions to the mistake book; a question that is already there is left alone.
export async function addMistakes(userId, items) {
  const unique = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    if (!item?.text || !Array.isArray(item.options) || !Number.isInteger(item.answer)) continue;
    const key = String(item.text).slice(0, 1000);
    if (!unique.has(key)) unique.set(key, {
      subject: text(item.subject, 50) || "", chapter: text(item.chapter, 150) || "", text: key, options: item.options.map(String), answer: item.answer,
      explanation: text(item.explanation, 4000), reason: text(item.reason, 100) || "", revisited: item.revisited ? 1 : 0,
    });
  }
  if (!unique.size) return;
  const pool = await getDb();
  await pool.request().input("u", sql.Int, userId).input("j", sql.NVarChar(sql.MAX), JSON.stringify([...unique.values()])).query(`
    INSERT INTO dbo.MistakeBook (UserId, Subject, Chapter, QuestionText, OptionsJson, CorrectOption, Explanation, Reason, IsRevisited)
    SELECT @u, s.subject, s.chapter, s.[text], s.options, s.answer, s.explanation, s.reason, s.revisited
    FROM OPENJSON(@j) WITH (subject NVARCHAR(50) '$.subject', chapter NVARCHAR(150) '$.chapter', [text] NVARCHAR(1000) '$.text', options NVARCHAR(MAX) '$.options' AS JSON,
      answer TINYINT '$.answer', explanation NVARCHAR(MAX) '$.explanation', reason NVARCHAR(100) '$.reason', revisited BIT '$.revisited') s
    WHERE NOT EXISTS (SELECT 1 FROM dbo.MistakeBook m WHERE m.UserId = @u AND m.QuestionHash = HASHBYTES('SHA2_256', s.[text]))`);
}

export async function updateMistake(userId, { text: question, reason, revisited }) {
  if (!question) throw new HttpError(400, "Missing question.");
  const pool = await getDb();
  await pool.request().input("u", sql.Int, userId).input("t", sql.NVarChar(1000), String(question).slice(0, 1000))
    .input("reason", sql.NVarChar(100), reason === undefined ? null : text(reason, 100)).input("setReason", sql.Bit, reason === undefined ? 0 : 1)
    .input("revisited", sql.Bit, revisited === undefined ? null : revisited ? 1 : 0).query(`
      UPDATE dbo.MistakeBook SET Reason = CASE WHEN @setReason = 1 THEN @reason ELSE Reason END, IsRevisited = ISNULL(@revisited, IsRevisited), UpdatedAt = SYSUTCDATETIME()
      WHERE UserId = @u AND QuestionHash = HASHBYTES('SHA2_256', @t)`);
}

export async function removeMistake(userId, question) {
  if (!question) throw new HttpError(400, "Missing question.");
  const pool = await getDb();
  await pool.request().input("u", sql.Int, userId).input("t", sql.NVarChar(1000), String(question).slice(0, 1000))
    .query("DELETE FROM dbo.MistakeBook WHERE UserId = @u AND QuestionHash = HASHBYTES('SHA2_256', @t)");
}

// ---------------------------------------------------------------- timed tests

const answerRowsFrom = (session) => {
  const indexes = new Set([...Object.keys(session.answers || {}), ...(session.marked || []), ...Object.entries(session.spent || {}).filter(([, ms]) => ms > 0).map(([i]) => i)].map(Number));
  return [...indexes].filter(Number.isInteger).map((i) => ({
    i, sel: Number.isInteger(session.answers?.[i]) ? session.answers[i] : null, marked: (session.marked || []).includes(i) ? 1 : 0, ms: Math.max(0, Math.round(session.spent?.[i] || 0)),
  }));
};

const insertAnswers = (request, attemptId, rows) => request().input("a", sql.Int, attemptId).input("j", sql.NVarChar(sql.MAX), JSON.stringify(rows)).query(`
  DELETE FROM dbo.TestAttemptAnswers WHERE AttemptId = @a;
  INSERT INTO dbo.TestAttemptAnswers (AttemptId, QuestionIndex, SelectedOption, IsMarked, TimeSpentMs)
  SELECT @a, i, sel, marked, ms FROM OPENJSON(@j) WITH (i SMALLINT '$.i', sel TINYINT '$.sel', marked BIT '$.marked', ms INT '$.ms')`);

// Autosave of a test that is running (so it can be resumed, also on another device).
export async function saveSession(userId, type, session) {
  checkType(type);
  if (!session?.contestId || !Number.isFinite(session.startedAt) || !Number.isFinite(session.endsAt)) throw new HttpError(400, "Invalid test session.");
  await inTransaction(async (request) => {
    const existing = (await request().input("u", sql.Int, userId).input("t", sql.VarChar(10), type).query("SELECT Id, TestKey FROM dbo.TestAttempts WHERE UserId = @u AND TestType = @t AND Status = 'InProgress'")).recordset[0];
    let id = existing?.Id;
    if (id && existing.TestKey !== session.contestId) {
      await request().input("id", sql.Int, id).query("DELETE FROM dbo.TestAttempts WHERE Id = @id");
      id = null;
    }
    if (!id) {
      id = (await request().input("u", sql.Int, userId).input("t", sql.VarChar(10), type).input("key", sql.NVarChar(100), session.contestId).input("title", sql.NVarChar(200), text(session.title, 200) || session.contestId)
        .input("virtual", sql.Bit, session.virtual ? 1 : 0).input("start", sql.BigInt, session.startedAt).input("end", sql.BigInt, session.endsAt).input("total", sql.SmallInt, Number(session.total) || 0)
        .query(`INSERT INTO dbo.TestAttempts (UserId, TestType, TestKey, Title, IsVirtual, Status, StartedAt, EndsAt, TotalQuestions)
          OUTPUT INSERTED.Id VALUES (@u, @t, @key, @title, @virtual, 'InProgress', ${toDate("@start")}, ${toDate("@end")}, @total)`)).recordset[0].Id;
    }
    await request().input("id", sql.Int, id).input("cur", sql.SmallInt, Number(session.current) || 0).query("UPDATE dbo.TestAttempts SET CurrentIndex = @cur WHERE Id = @id");
    await insertAnswers(request, id, answerRowsFrom(session));
  });
}

export async function discardSession(userId, type) {
  checkType(type);
  const pool = await getDb();
  await pool.request().input("u", sql.Int, userId).input("t", sql.VarChar(10), type).query("DELETE FROM dbo.TestAttempts WHERE UserId = @u AND TestType = @t AND Status = 'InProgress'");
}

// Finishes an attempt (the running one if there is one, otherwise it is created already submitted).
export async function submitAttempt(userId, type, entry) {
  checkType(type);
  const total = Number(entry?.total);
  if (!entry?.contestId || !Number.isInteger(total) || total < 1 || !Array.isArray(entry.answers) || !day(entry.d)) throw new HttpError(400, "Invalid test result.");
  const at = Number(entry.at) || Date.now();
  const timeTaken = Math.max(0, Math.round(Number(entry.timeTaken) || 0));
  const rows = Array.from({ length: total }, (_, i) => ({ i, sel: Number.isInteger(entry.answers[i]) ? entry.answers[i] : null, marked: 0, ms: Math.max(0, Math.round((entry.spent?.[i] || 0) * 1000)) }));
  await inTransaction(async (request) => {
    const running = (await request().input("u", sql.Int, userId).input("t", sql.VarChar(10), type).input("key", sql.NVarChar(100), entry.contestId)
      .query("SELECT Id FROM dbo.TestAttempts WHERE UserId = @u AND TestType = @t AND Status = 'InProgress' AND TestKey = @key")).recordset[0];
    const bind = (r) => r.input("title", sql.NVarChar(200), text(entry.title, 200) || entry.contestId).input("virtual", sql.Bit, entry.virtual ? 1 : 0)
      .input("start", sql.BigInt, Number(entry.startedAt) || at - timeTaken).input("end", sql.BigInt, Number(entry.endsAt) || at).input("at", sql.BigInt, at).input("on", sql.NVarChar(10), entry.d)
      .input("taken", sql.BigInt, timeTaken).input("total", sql.SmallInt, total).input("correct", sql.SmallInt, num(entry.correct) || 0).input("wrong", sql.SmallInt, num(entry.wrong) || 0)
      .input("skipped", sql.SmallInt, num(entry.skipped) || 0).input("score", sql.SmallInt, num(entry.score) || 0).input("acc", sql.TinyInt, Math.min(100, Math.max(0, num(entry.accuracy) || 0)));
    let id;
    if (running) {
      id = running.Id;
      await bind(request().input("id", sql.Int, id)).query(`UPDATE dbo.TestAttempts SET Title = @title, IsVirtual = @virtual, Status = 'Submitted', SubmittedAt = ${toDate("@at")}, SubmittedOn = CAST(@on AS DATE),
        TimeTakenMs = @taken, TotalQuestions = @total, Correct = @correct, Wrong = @wrong, Skipped = @skipped, Score = @score, Accuracy = @acc WHERE Id = @id`);
    } else {
      id = (await bind(request().input("u", sql.Int, userId).input("t", sql.VarChar(10), type).input("key", sql.NVarChar(100), entry.contestId))
        .query(`INSERT INTO dbo.TestAttempts (UserId, TestType, TestKey, Title, IsVirtual, Status, StartedAt, EndsAt, SubmittedAt, SubmittedOn, TimeTakenMs, TotalQuestions, Correct, Wrong, Skipped, Score, Accuracy)
          OUTPUT INSERTED.Id VALUES (@u, @t, @key, @title, @virtual, 'Submitted', ${toDate("@start")}, ${toDate("@end")}, ${toDate("@at")}, CAST(@on AS DATE), @taken, @total, @correct, @wrong, @skipped, @score, @acc)`)).recordset[0].Id;
    }
    await insertAnswers(request, id, rows);
  });
}

export async function setRegistration(userId, contestKey, registered) {
  if (!contestKey) throw new HttpError(400, "Missing contest.");
  const pool = await getDb();
  const request = pool.request().input("u", sql.Int, userId).input("key", sql.NVarChar(100), String(contestKey));
  await request.query(registered
    ? "IF NOT EXISTS (SELECT 1 FROM dbo.ContestRegistrations WHERE UserId = @u AND ContestKey = @key) INSERT INTO dbo.ContestRegistrations (UserId, ContestKey) VALUES (@u, @key)"
    : "DELETE FROM dbo.ContestRegistrations WHERE UserId = @u AND ContestKey = @key");
}

// ---------------------------------------------------------------- settings, notifications, mentor requests

export async function markNotificationsRead(userId, reads) {
  const unique = new Map();
  for (const r of (Array.isArray(reads) ? reads : []).slice(0, 200)) if (r?.id && !unique.has(String(r.id))) unique.set(String(r.id), { key: text(r.id, 150), at: Number(r.readAt) || Date.now() });
  const rows = [...unique.values()];
  if (!rows.length) return;
  const pool = await getDb();
  await pool.request().input("u", sql.Int, userId).input("j", sql.NVarChar(sql.MAX), JSON.stringify(rows)).query(`
    INSERT INTO dbo.NotificationReads (UserId, NotificationKey, ReadAt)
    SELECT @u, s.[key], ${toDate("s.at")} FROM OPENJSON(@j) WITH ([key] NVARCHAR(150) '$.key', at BIGINT '$.at') s
    WHERE NOT EXISTS (SELECT 1 FROM dbo.NotificationReads n WHERE n.UserId = @u AND n.NotificationKey = s.[key])`);
}

export async function setTheme(userId, theme) {
  if (!["light", "dark"].includes(theme)) throw new HttpError(400, "Theme must be light or dark.");
  const pool = await getDb();
  await pool.request().input("u", sql.Int, userId).input("t", sql.VarChar(5), theme).query(`
    MERGE dbo.UserSettings AS t USING (SELECT @u AS UserId) AS s ON t.UserId = s.UserId
    WHEN MATCHED THEN UPDATE SET Theme = @t, UpdatedAt = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT (UserId, Theme) VALUES (@u, @t);`);
}

// A student can have one live request at a time; asking again while one is Open or Assigned just returns it.
export async function createMentorRequest(userId, context) {
  const pool = await getDb();
  const live = (await pool.request().input("u", sql.Int, userId)
    .query("SELECT TOP (1) Status, AssignedTo FROM dbo.MentorRequests WHERE UserId = @u AND Status IN ('Open', 'Assigned') ORDER BY Id DESC")).recordset[0];
  if (live) return { status: live.Status, assignedTo: live.AssignedTo };
  await pool.request().input("u", sql.Int, userId).input("c", sql.NVarChar(1000), text(context, 1000))
    .query("INSERT INTO dbo.MentorRequests (UserId, Context) VALUES (@u, @c)");
  return { status: "Open", assignedTo: null };
}

// ---------------------------------------------------------------- one-time import of what used to be in localStorage

export async function importLegacy(userId, legacy) {
  const summary = { mistakes: 0, answers: 0, days: 0, tests: 0 };
  const pool = await getDb();
  const one = async (query, params = {}) => {
    const request = pool.request().input("u", sql.Int, userId);
    for (const [name, [type, value]] of Object.entries(params)) request.input(name, type, value);
    return (await request.query(query)).recordset;
  };

  if (Array.isArray(legacy.mistakes)) { await addMistakes(userId, legacy.mistakes); summary.mistakes = legacy.mistakes.length; }

  if (Array.isArray(legacy.answers) && legacy.answers.length && (await one("SELECT COUNT(*) AS n FROM dbo.PracticeAnswers WHERE UserId = @u"))[0].n === 0) {
    const list = legacy.answers.slice(-3000);
    for (let i = 0; i < list.length; i += 500) await addAnswers(userId, list.slice(i, i + 500));
    summary.answers = list.length;
  }

  for (const key of Array.isArray(legacy.chaptersDone) ? legacy.chaptersDone : []) {
    await one("IF NOT EXISTS (SELECT 1 FROM dbo.ChapterProgress WHERE UserId = @u AND ChapterKey = @k) INSERT INTO dbo.ChapterProgress (UserId, ChapterKey) VALUES (@u, @k)", { k: [sql.NVarChar(150), text(key, 150)] });
  }

  // Study-task completions: rebuild one (imported) plan per day that has none yet.
  const byDay = new Map();
  for (const entry of Array.isArray(legacy.done) ? legacy.done : []) {
    if (!entry || !day(entry.d) || !entry.id) continue;
    if (!byDay.has(entry.d)) byDay.set(entry.d, []);
    byDay.get(entry.d).push(entry);
  }
  const lastDay = [...byDay.keys()].sort().at(-1);
  for (const [date, entries] of byDay) {
    if ((await one("SELECT 1 AS x FROM dbo.StudyPlans WHERE UserId = @u AND PlanDate = CAST(@d AS DATE)", { d: [sql.NVarChar(10), date] })).length) continue;
    await savePlan(userId, { date, signature: "imported", tasks: entries.map((e) => {
      const id = String(e.id);
      const chapterKey = id.startsWith("study:") ? id.slice(6) : null;
      const chapter = chapterKey ? chapterKey.split(":")[1] || chapterKey : null;
      return { id, type: chapterKey ? "chapter" : id === "mistakes" ? "mistakes" : "routine", title: chapter ? `Revise ${chapter}` : id, minutes: Number(e.m) || 0, chapterId: chapterKey, chapter, subject: chapterKey?.split(":")[0] };
    }) });
    for (const e of entries) {
      const id = String(e.id);
      const score = date === lastDay ? legacy.scores?.[id] : null;
      await setTask(userId, { date, taskKey: id, completed: true, score, chapterKey: id.startsWith("study:") ? id.slice(6) : null });
    }
    summary.days += 1;
  }

  // Past contest / mock attempts.
  for (const type of TEST_TYPES) {
    for (const entry of Array.isArray(legacy[`${type}History`]) ? legacy[`${type}History`] : []) {
      if (!entry?.contestId || !Number.isFinite(entry.at) || !day(entry.d)) continue;
      const exists = await one(`SELECT 1 AS x FROM dbo.TestAttempts WHERE UserId = @u AND TestType = @t AND TestKey = @k AND SubmittedAt = ${toDate("@at")}`,
        { t: [sql.VarChar(10), type], k: [sql.NVarChar(100), entry.contestId], at: [sql.BigInt, entry.at] });
      if (exists.length) continue;
      await submitAttempt(userId, type, entry);
      summary.tests += 1;
    }
  }

  if (legacy.contestKey && legacy.registered === true) await setRegistration(userId, legacy.contestKey, true);
  await markNotificationsRead(userId, legacy.notificationReads);
  return summary;
}
