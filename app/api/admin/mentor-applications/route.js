import { adminRoute } from "@/lib/admin";
import { getDb, sql } from "@/lib/db";

// GET - List mentor applications with status counts, filtering, search, and sorting
export const GET = adminRoute(async ({ query }) => {
  const pool = await getDb();
  const statusFilter = query.get("status") || "All";
  const search = query.get("search")?.trim() || "";
  const sortBy = query.get("sortBy") || "createdAt";
  const sortOrder = query.get("sortOrder") === "asc" ? "ASC" : "DESC";

  const request = pool.request();
  const conditions = [];

  if (statusFilter && statusFilter !== "All") {
    request.input("status", sql.VarChar(30), statusFilter);
    conditions.push("m.Status = @status");
  }

  if (search) {
    request.input("search", sql.NVarChar(200), `%${search}%`);
    conditions.push(`(
      m.FullName LIKE @search OR
      m.Email LIKE @search OR
      m.Institute LIKE @search OR
      m.CurrentProfession LIKE @search OR
      m.Subjects LIKE @search OR
      m.ApplicationId LIKE @search
    )`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Validate sort column to avoid SQL injection
  let orderByCol = "m.CreatedAt";
  if (sortBy === "experience") orderByCol = "m.ExperienceYears";
  else if (sortBy === "name") orderByCol = "m.FullName";
  else if (sortBy === "status") orderByCol = "m.Status";

  const rowsResult = await request.query(`
    SELECT
      m.Id, m.ApplicationId, m.FullName, m.Email, m.Phone, m.HighestQualification,
      m.Institute, m.CurrentProfession, m.ExperienceYears, m.Subjects, m.Bio,
      m.TeachingExperience, m.PreferredMode, m.LinkedInUrl, m.TargetExams, m.AvailabilityHours,
      m.ResumeFileName, m.ResumeOriginalName, m.ResumeFileSize, m.ResumeMimeType,
      m.Status, m.InterviewDate, m.InterviewTime, m.MeetingMode, m.MeetingLink,
      m.AdminNotes, m.ReviewedAt, m.CreatedAt, m.UpdatedAt,
      u.Name AS ReviewedByAdminName
    FROM dbo.MentorApplications m
    LEFT JOIN dbo.Users u ON u.Id = m.ReviewedByAdminId
    ${whereClause}
    ORDER BY ${orderByCol} ${sortOrder}
  `);

  // Count aggregates for dashboard metrics
  const countResult = await pool.request().query(`
    SELECT Status, COUNT(*) AS Total
    FROM dbo.MentorApplications
    GROUP BY Status
  `);

  const counts = {
    Total: 0,
    Pending: 0,
    "Under Review": 0,
    "Interview Scheduled": 0,
    Accepted: 0,
    Declined: 0,
  };

  for (const row of countResult.recordset) {
    const s = row.Status;
    const n = Number(row.Total || 0);
    if (counts[s] !== undefined) counts[s] = n;
    counts.Total += n;
  }

  return {
    counts,
    applications: rowsResult.recordset.map((r) => ({
      id: Number(r.Id),
      applicationId: r.ApplicationId,
      fullName: r.FullName,
      email: r.Email,
      phone: r.Phone,
      highestQualification: r.HighestQualification,
      institute: r.Institute,
      currentProfession: r.CurrentProfession,
      experienceYears: Number(r.ExperienceYears || 0),
      subjects: r.Subjects,
      bio: r.Bio,
      teachingExperience: r.TeachingExperience,
      preferredMode: r.PreferredMode,
      linkedInUrl: r.LinkedInUrl,
      targetExams: r.TargetExams,
      availabilityHours: Number(r.AvailabilityHours || 0),
      resume: {
        fileName: r.ResumeFileName,
        originalName: r.ResumeOriginalName,
        size: Number(r.ResumeFileSize || 0),
        mimeType: r.ResumeMimeType,
        downloadUrl: `/api/admin/mentor-applications/${r.Id}/resume`,
      },
      status: r.Status,
      interview: r.InterviewDate ? {
        date: r.InterviewDate,
        time: r.InterviewTime || "",
        mode: r.MeetingMode || "",
        link: r.MeetingLink || "",
      } : null,
      adminNotes: r.AdminNotes || "",
      reviewedAt: r.ReviewedAt,
      reviewedBy: r.ReviewedByAdminName,
      createdAt: r.CreatedAt,
      updatedAt: r.UpdatedAt,
    })),
  };
});

