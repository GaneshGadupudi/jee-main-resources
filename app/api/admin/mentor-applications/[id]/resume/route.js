import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin";
import { getDb, sql } from "@/lib/db";
import { getResumeFileBuffer } from "@/lib/storage";

export async function GET(request, context) {
  try {
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin authorization required." }, { status: 403 });
    }

    const rawParams = context?.params ? await context.params : {};
    const id = Number(rawParams?.id);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid application ID." }, { status: 400 });
    }

    const pool = await getDb();
    const res = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT TOP (1) ResumeFileName, ResumeOriginalName, ResumeMimeType FROM dbo.MentorApplications WHERE Id = @id");

    const app = res.recordset[0];
    if (!app || !app.ResumeFileName) {
      return NextResponse.json({ error: "Resume file record not found." }, { status: 404 });
    }

    const fileData = await getResumeFileBuffer(app.ResumeFileName);
    if (!fileData) {
      return NextResponse.json({ error: "Resume file not found on storage." }, { status: 404 });
    }

    const mimeType = app.ResumeMimeType || "application/pdf";
    const downloadName = encodeURIComponent(app.ResumeOriginalName || "mentor-resume.pdf");

    return new NextResponse(fileData.buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${downloadName}"`,
        "Content-Length": String(fileData.stat.size),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Resume file download error:", error);
    return NextResponse.json({ error: "Unable to retrieve resume." }, { status: 500 });
  }
}

