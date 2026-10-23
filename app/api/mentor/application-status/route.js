import { NextResponse } from "next/server";
import { getDb, sql } from "@/lib/db";
import { getSession } from "@/lib/auth-server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryAppId = searchParams.get("applicationId")?.trim();
    const queryEmail = searchParams.get("email")?.trim().toLowerCase();

    const session = await getSession();
    const sessionEmail = session?.email?.toLowerCase();

    const pool = await getDb();
    let result;

    if (queryAppId) {
      result = await pool.request()
        .input("appId", sql.NVarChar(50), queryAppId)
        .query(`
          SELECT TOP (1)
            ApplicationId, FullName, Email, Status, Subjects, HighestQualification,
            Institute, PreferredMode, InterviewDate, InterviewTime, MeetingMode,
            MeetingLink, AdminNotes, CreatedAt, UpdatedAt
          FROM dbo.MentorApplications
          WHERE ApplicationId = @appId
          ORDER BY CreatedAt DESC
        `);
    } else if (queryEmail || sessionEmail) {
      const emailToLookup = queryEmail || sessionEmail;
      result = await pool.request()
        .input("email", sql.NVarChar(320), emailToLookup)
        .query(`
          SELECT TOP (1)
            ApplicationId, FullName, Email, Status, Subjects, HighestQualification,
            Institute, PreferredMode, InterviewDate, InterviewTime, MeetingMode,
            MeetingLink, AdminNotes, CreatedAt, UpdatedAt
          FROM dbo.MentorApplications
          WHERE Email = @email
          ORDER BY CreatedAt DESC
        `);
    } else {
      return NextResponse.json(
        { error: "Please provide an Application ID or Email address to check status." },
        { status: 400 }
      );
    }

    const app = result.recordset[0];
    if (!app) {
      return NextResponse.json(
        { error: "No application found matching the provided details." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      application: {
        applicationId: app.ApplicationId,
        fullName: app.FullName,
        email: app.Email,
        status: app.Status,
        subjects: app.Subjects,
        highestQualification: app.HighestQualification,
        institute: app.Institute,
        preferredMode: app.PreferredMode,
        interview: app.Status === "Interview Scheduled" && app.InterviewDate ? {
          date: app.InterviewDate,
          time: app.InterviewTime || "",
          mode: app.MeetingMode || "Online",
          link: app.MeetingLink || "",
        } : null,
        adminNotes: app.AdminNotes || null,
        createdAt: app.CreatedAt,
        updatedAt: app.UpdatedAt,
      },
    });
  } catch (error) {
    console.error("Mentor application status lookup failed:", error);
    return NextResponse.json(
      { error: "Unable to check application status." },
      { status: 500 }
    );
  }
}

