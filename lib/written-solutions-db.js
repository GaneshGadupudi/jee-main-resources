import { getDb, sql } from "./db.js";
import { deleteSolutionImage, deleteQuestionImage } from "./solutions-storage.js";
import crypto from "node:crypto";

/**
 * Server-side expiration maintenance:
 * Cleans up solutions that have passed their 30-day expiration window.
 * Removes both the stored image files from disk and the database records.
 */
export async function purgeExpiredWrittenSolutions() {
  try {
    const pool = await getDb();

    // 1. Identify all expired completed solutions
    const expiredResult = await pool.request().query(`
      SELECT Id, RequestId, SolutionImageFileName, QuestionImageUrl
      FROM dbo.WrittenSolutionRequests
      WHERE Status = 'Completed' AND ExpiresAt IS NOT NULL AND ExpiresAt <= SYSUTCDATETIME()
    `);

    const expiredRows = expiredResult.recordset;

    if (expiredRows.length > 0) {
      console.log(`[WrittenSolutions] Purging ${expiredRows.length} expired solutions (30-day expiration policy)...`);

      // 2. Delete files from physical storage
      for (const row of expiredRows) {
        if (row.SolutionImageFileName) {
          await deleteSolutionImage(row.SolutionImageFileName);
        }
        if (row.QuestionImageUrl && row.QuestionImageUrl.startsWith("q_")) {
          await deleteQuestionImage(row.QuestionImageUrl);
        }
      }

      // 3. Delete database records
      const ids = expiredRows.map((r) => r.Id).join(",");
      await pool.request().query(`
        DELETE FROM dbo.WrittenSolutionRequests
        WHERE Id IN (${ids})
      `);

      console.log(`[WrittenSolutions] Purged ${expiredRows.length} expired records.`);
    }

    return expiredRows.length;
  } catch (error) {
    console.error("[WrittenSolutions] Error purging expired solutions:", error);
    return 0;
  }
}

/**
 * Creates a student request for a written/handwritten solution.
 */
export async function createWrittenSolutionRequest({
  studentId,
  subject,
  chapter,
  questionText,
  questionImageUrl = null,
}) {
  const pool = await getDb();

  const year = new Date().getFullYear();
  const randNum = crypto.randomInt(10000, 99999);
  const requestId = `WS-${year}-${randNum}`;

  const result = await pool
    .request()
    .input("requestId", sql.NVarChar(50), requestId)
    .input("studentId", sql.Int, studentId)
    .input("subject", sql.NVarChar(100), subject.trim())
    .input("chapter", sql.NVarChar(150), chapter ? chapter.trim() : null)
    .input("questionText", sql.NVarChar(sql.MAX), questionText.trim())
    .input("questionImageUrl", sql.NVarChar(500), questionImageUrl)
    .query(`
      INSERT INTO dbo.WrittenSolutionRequests (
        RequestId, StudentId, Subject, Chapter, QuestionText, QuestionImageUrl, Status, CreatedAt, UpdatedAt
      )
      OUTPUT
        INSERTED.Id,
        INSERTED.RequestId,
        INSERTED.StudentId,
        INSERTED.Subject,
        INSERTED.Chapter,
        INSERTED.QuestionText,
        INSERTED.QuestionImageUrl,
        INSERTED.Status,
        INSERTED.CreatedAt
      VALUES (
        @requestId, @studentId, @subject, @chapter, @questionText, @questionImageUrl, 'Pending', SYSUTCDATETIME(), SYSUTCDATETIME()
      )
    `);

  const row = result.recordset[0];
  return {
    ...row,
    Id: Number(row.Id),
    StudentId: Number(row.StudentId),
  };
}

/**
 * Get all requests and solutions for a student.
 * Filters out expired solutions and computes remaining days of the 30-day window.
 */
export async function getStudentWrittenSolutions(studentId) {
  // Run expiration cleanup first
  await purgeExpiredWrittenSolutions();

  const pool = await getDb();
  const result = await pool
    .request()
    .input("studentId", sql.Int, studentId)
    .query(`
      SELECT
        r.Id,
        r.RequestId,
        r.Subject,
        r.Chapter,
        r.QuestionText,
        r.QuestionImageUrl,
        r.Status,
        r.SolutionImageFileName,
        r.SolutionImageOriginalName,
        r.SolutionImageFileSize,
        r.MentorNotes,
        r.CreatedAt,
        r.AssignedAt,
        r.SolvedAt,
        r.ExpiresAt,
        u.Name AS MentorName,
        u.Email AS MentorEmail
      FROM dbo.WrittenSolutionRequests r
      LEFT JOIN dbo.Users u ON u.Id = r.MentorId
      WHERE r.StudentId = @studentId
        AND (r.ExpiresAt IS NULL OR r.ExpiresAt > SYSUTCDATETIME())
      ORDER BY r.CreatedAt DESC
    `);

  const now = Date.now();
  return result.recordset.map((row) => {
    let daysRemaining = null;
    if (row.ExpiresAt) {
      const diffMs = new Date(row.ExpiresAt).getTime() - now;
      daysRemaining = Math.min(30, Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24))));
    }

    return {
      id: Number(row.Id),
      requestId: row.RequestId,
      subject: row.Subject,
      chapter: row.Chapter,
      questionText: row.QuestionText,
      hasQuestionImage: Boolean(row.QuestionImageUrl),
      questionImageUrl: row.QuestionImageUrl
        ? `/api/solutions/${row.Id}/question-image`
        : null,
      status: row.Status,
      hasSolution: Boolean(row.SolutionImageFileName),
      solutionImageUrl: row.SolutionImageFileName
        ? `/api/solutions/${row.Id}/image`
        : null,
      solutionOriginalName: row.SolutionImageOriginalName,
      mentorNotes: row.MentorNotes,
      mentor: row.MentorName
        ? { name: row.MentorName, email: row.MentorEmail }
        : null,
      createdAt: row.CreatedAt,
      assignedAt: row.AssignedAt,
      solvedAt: row.SolvedAt,
      expiresAt: row.ExpiresAt,
      daysRemaining,
    };
  });
}

/**
 * Get written solutions dashboard data for a mentor:
 * - Pending unassigned requests
 * - Mentor's in-progress (Assigned) requests
 * - Mentor's completed/sent solutions (within 30 days)
 */
export async function getMentorWrittenSolutions(mentorId) {
  await purgeExpiredWrittenSolutions();

  const pool = await getDb();

  // 1. Pending unassigned requests
  const pendingRes = await pool.request().query(`
    SELECT
      r.Id,
      r.RequestId,
      r.Subject,
      r.Chapter,
      r.QuestionText,
      r.QuestionImageUrl,
      r.Status,
      r.CreatedAt,
      s.Name AS StudentName,
      s.Email AS StudentEmail
    FROM dbo.WrittenSolutionRequests r
    JOIN dbo.Users s ON s.Id = r.StudentId
    WHERE r.Status = 'Pending'
    ORDER BY r.CreatedAt ASC
  `);

  // 2. Mentor's assigned in-progress requests
  const assignedRes = await pool
    .request()
    .input("mentorId", sql.Int, mentorId)
    .query(`
      SELECT
        r.Id,
        r.RequestId,
        r.Subject,
        r.Chapter,
        r.QuestionText,
        r.QuestionImageUrl,
        r.Status,
        r.CreatedAt,
        r.AssignedAt,
        s.Name AS StudentName,
        s.Email AS StudentEmail
      FROM dbo.WrittenSolutionRequests r
      JOIN dbo.Users s ON s.Id = r.StudentId
      WHERE r.MentorId = @mentorId AND r.Status = 'Assigned'
      ORDER BY r.AssignedAt DESC
    `);

  // 3. Mentor's sent/completed solutions
  const completedRes = await pool
    .request()
    .input("mentorId", sql.Int, mentorId)
    .query(`
      SELECT
        r.Id,
        r.RequestId,
        r.Subject,
        r.Chapter,
        r.QuestionText,
        r.QuestionImageUrl,
        r.Status,
        r.SolutionImageFileName,
        r.SolutionImageOriginalName,
        r.MentorNotes,
        r.CreatedAt,
        r.AssignedAt,
        r.SolvedAt,
        r.ExpiresAt,
        s.Name AS StudentName,
        s.Email AS StudentEmail
      FROM dbo.WrittenSolutionRequests r
      JOIN dbo.Users s ON s.Id = r.StudentId
      WHERE r.MentorId = @mentorId
        AND r.Status = 'Completed'
        AND (r.ExpiresAt IS NULL OR r.ExpiresAt > SYSUTCDATETIME())
      ORDER BY r.SolvedAt DESC
    `);

  const now = Date.now();

  const mapRow = (r) => {
    let daysRemaining = null;
    if (r.ExpiresAt) {
      const diffMs = new Date(r.ExpiresAt).getTime() - now;
      daysRemaining = Math.min(30, Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24))));
    }

    return {
      id: Number(r.Id),
      requestId: r.RequestId,
      subject: r.Subject,
      chapter: r.Chapter,
      questionText: r.QuestionText,
      hasQuestionImage: Boolean(r.QuestionImageUrl),
      questionImageUrl: r.QuestionImageUrl
        ? `/api/solutions/${r.Id}/question-image`
        : null,
      status: r.Status,
      hasSolution: Boolean(r.SolutionImageFileName),
      solutionImageUrl: r.SolutionImageFileName
        ? `/api/solutions/${r.Id}/image`
        : null,
      solutionOriginalName: r.SolutionImageOriginalName,
      mentorNotes: r.MentorNotes,
      student: { name: r.StudentName, email: r.StudentEmail },
      createdAt: r.CreatedAt,
      assignedAt: r.AssignedAt,
      solvedAt: r.SolvedAt,
      expiresAt: r.ExpiresAt,
      daysRemaining,
    };
  };

  return {
    pending: pendingRes.recordset.map(mapRow),
    assigned: assignedRes.recordset.map(mapRow),
    completed: completedRes.recordset.map(mapRow),
  };
}

/**
 * Mentor accepts a pending request.
 */
export async function acceptWrittenSolutionRequest(requestId, mentorId) {
  const pool = await getDb();

  const res = await pool
    .request()
    .input("mentorId", sql.Int, mentorId)
    .input("idOrReqId", sql.NVarChar(50), String(requestId))
    .query(`
      UPDATE dbo.WrittenSolutionRequests
      SET
        MentorId = @mentorId,
        Status = 'Assigned',
        AssignedAt = SYSUTCDATETIME(),
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT
        INSERTED.Id,
        INSERTED.RequestId,
        INSERTED.Status,
        INSERTED.AssignedAt
      WHERE (CAST(Id AS NVARCHAR(50)) = @idOrReqId OR RequestId = @idOrReqId)
        AND Status = 'Pending'
    `);

  if (!res.recordset || res.recordset.length === 0) {
    return null;
  }

  const row = res.recordset[0];
  return {
    ...row,
    Id: Number(row.Id),
  };
}

/**
 * Mentor submits the handwritten solution photo.
 * Sets Status = 'Completed', SolvedAt = SYSUTCDATETIME(), and ExpiresAt = 30 days from now.
 */
export async function submitWrittenSolution({
  requestId,
  mentorId,
  fileName,
  originalName,
  filePath,
  mimeType,
  fileSize,
  mentorNotes = null,
}) {
  const pool = await getDb();

  const res = await pool
    .request()
    .input("mentorId", sql.Int, mentorId)
    .input("idOrReqId", sql.NVarChar(50), String(requestId))
    .input("fileName", sql.NVarChar(255), fileName)
    .input("originalName", sql.NVarChar(255), originalName)
    .input("filePath", sql.NVarChar(500), filePath)
    .input("mimeType", sql.NVarChar(100), mimeType)
    .input("fileSize", sql.Int, fileSize)
    .input("mentorNotes", sql.NVarChar(1000), mentorNotes ? mentorNotes.trim() : null)
    .query(`
      UPDATE dbo.WrittenSolutionRequests
      SET
        Status = 'Completed',
        SolutionImageFileName = @fileName,
        SolutionImageOriginalName = @originalName,
        SolutionImageFilePath = @filePath,
        SolutionImageMimeType = @mimeType,
        SolutionImageFileSize = @fileSize,
        MentorNotes = @mentorNotes,
        SolvedAt = SYSUTCDATETIME(),
        ExpiresAt = DATEADD(day, 30, SYSUTCDATETIME()),
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT
        INSERTED.Id,
        INSERTED.RequestId,
        INSERTED.StudentId,
        INSERTED.Subject,
        INSERTED.Chapter,
        INSERTED.QuestionText,
        INSERTED.Status,
        INSERTED.SolutionImageFileName,
        INSERTED.MentorNotes,
        INSERTED.SolvedAt,
        INSERTED.ExpiresAt
      WHERE (CAST(Id AS NVARCHAR(50)) = @idOrReqId OR RequestId = @idOrReqId)
        AND (MentorId = @mentorId OR MentorId IS NULL)
    `);

  if (!res.recordset || res.recordset.length === 0) {
    return null;
  }

  const row = res.recordset[0];
  return {
    ...row,
    Id: Number(row.Id),
    StudentId: Number(row.StudentId),
  };
}

/**
 * Get solution request by Id for authorization check.
 */
export async function getWrittenSolutionById(id) {
  const pool = await getDb();
  const res = await pool
    .request()
    .input("idOrReqId", sql.NVarChar(50), String(id))
    .query(`
      SELECT TOP 1 *
      FROM dbo.WrittenSolutionRequests
      WHERE CAST(Id AS NVARCHAR(50)) = @idOrReqId OR RequestId = @idOrReqId
    `);

  if (!res.recordset || !res.recordset[0]) return null;
  const row = res.recordset[0];
  return {
    ...row,
    Id: Number(row.Id),
    StudentId: Number(row.StudentId),
    MentorId: row.MentorId ? Number(row.MentorId) : null,
  };
}
