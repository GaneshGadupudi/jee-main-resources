import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb, sql } from "@/lib/db";
import { saveResumeFile } from "@/lib/storage";
import { sendMail } from "@/lib/mailer";

export async function POST(request) {
  try {
    const formData = await request.formData();

    const fullName = String(formData.get("fullName") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const phone = String(formData.get("phone") || "").trim();
    const highestQualification = String(formData.get("highestQualification") || "").trim();
    const institute = String(formData.get("institute") || "").trim();
    const currentProfession = String(formData.get("currentProfession") || "").trim();
    const experienceYearsRaw = formData.get("experienceYears");
    const experienceYears = Number.parseInt(String(experienceYearsRaw || "0"), 10);
    const subjects = String(formData.get("subjects") || "").trim();
    const bio = String(formData.get("bio") || "").trim();
    const teachingExperience = String(formData.get("teachingExperience") || "").trim();
    const preferredMode = String(formData.get("preferredMode") || "Online").trim() || "Online";
    const linkedInUrl = String(formData.get("linkedInUrl") || "").trim();
    const targetExams = String(formData.get("targetExams") || "JEE Main, JEE Advanced").trim() || "JEE Main, JEE Advanced";
    const availabilityHours = Number.parseInt(String(formData.get("availabilityHours") || "10"), 10);

    const resumeFile = formData.get("resume");

    // Server-side validation
    const errors = [];
    if (!fullName || fullName.length < 2) errors.push("Full Name is required (minimum 2 characters).");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("A valid Email Address is required.");
    if (!phone || phone.length < 7) errors.push("A valid Phone Number is required.");
    if (!highestQualification) errors.push("Highest Qualification is required.");
    if (!institute) errors.push("College/University or Institution is required.");
    if (!currentProfession) errors.push("Current Profession or Designation is required.");
    if (Number.isNaN(experienceYears) || experienceYears < 0) errors.push("Total Years of Experience must be 0 or greater.");
    if (!subjects) errors.push("At least one Area of Expertise or Subject is required.");
    // Short Professional Bio and Teaching/Mentoring Experience are now optional
    if (!resumeFile || typeof resumeFile.arrayBuffer !== "function" || resumeFile.size === 0) {
      errors.push("Resume document is required (PDF or Word format, max 5MB).");
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0], details: errors }, { status: 400 });
    }

    const pool = await getDb();

    // Check for duplicate pending or active application
    const existingCheck = await pool.request()
      .input("email", sql.NVarChar(320), email)
      .query(`
        SELECT TOP (1) ApplicationId, Status, CreatedAt
        FROM dbo.MentorApplications
        WHERE Email = @email AND Status IN ('Pending', 'Under Review', 'Interview Scheduled')
        ORDER BY CreatedAt DESC
      `);

    if (existingCheck.recordset.length > 0) {
      const activeApp = existingCheck.recordset[0];
      return NextResponse.json({
        error: `An active application (${activeApp.ApplicationId}) with status '${activeApp.Status}' already exists for this email. You can check its progress anytime.`,
        applicationId: activeApp.ApplicationId,
        status: activeApp.Status,
      }, { status: 409 });
    }

    // Generate unique Application ID
    const randomSuffix = crypto.randomInt(10000, 99999);
    const year = new Date().getFullYear();
    const applicationId = `APP-${year}-${randomSuffix}`;

    // Securely upload resume
    const uploadMeta = await saveResumeFile(resumeFile, applicationId);

    // Insert into database
    const insertRes = await pool.request()
      .input("appId", sql.NVarChar(50), applicationId)
      .input("fullName", sql.NVarChar(200), fullName)
      .input("email", sql.NVarChar(320), email)
      .input("phone", sql.NVarChar(30), phone)
      .input("highestQualification", sql.NVarChar(150), highestQualification)
      .input("institute", sql.NVarChar(250), institute)
      .input("currentProfession", sql.NVarChar(200), currentProfession)
      .input("experienceYears", sql.Int, experienceYears)
      .input("subjects", sql.NVarChar(500), subjects)
      .input("bio", sql.NVarChar(2000), bio || null)
      .input("teachingExperience", sql.NVarChar(2000), teachingExperience || null)
      .input("preferredMode", sql.VarChar(20), ["Online", "Offline", "Hybrid"].includes(preferredMode) ? preferredMode : "Online")
      .input("linkedInUrl", sql.NVarChar(500), linkedInUrl || null)
      .input("targetExams", sql.NVarChar(200), targetExams || null)
      .input("availabilityHours", sql.Int, Number.isNaN(availabilityHours) ? 10 : availabilityHours)
      .input("resumeFileName", sql.NVarChar(255), uploadMeta.fileName)
      .input("resumeOriginalName", sql.NVarChar(255), uploadMeta.originalName)
      .input("resumeFilePath", sql.NVarChar(500), uploadMeta.filePath)
      .input("resumeFileSize", sql.Int, uploadMeta.fileSize)
      .input("resumeMimeType", sql.NVarChar(100), uploadMeta.mimeType)
      .query(`
        INSERT INTO dbo.MentorApplications (
          ApplicationId, FullName, Email, Phone, HighestQualification, Institute,
          CurrentProfession, ExperienceYears, Subjects, Bio, TeachingExperience,
          PreferredMode, LinkedInUrl, TargetExams, AvailabilityHours,
          ResumeFileName, ResumeOriginalName, ResumeFilePath, ResumeFileSize, ResumeMimeType,
          Status
        )
        OUTPUT INSERTED.Id
        VALUES (
          @appId, @fullName, @email, @phone, @highestQualification, @institute,
          @currentProfession, @experienceYears, @subjects, @bio, @teachingExperience,
          @preferredMode, @linkedInUrl, @targetExams, @availabilityHours,
          @resumeFileName, @resumeOriginalName, @resumeFilePath, @resumeFileSize, @resumeMimeType,
          'Pending'
        );
      `);

    const insertedId = insertRes.recordset[0]?.Id;

    // Send confirmation email asynchronously (swallows non-fatal email errors)
    try {
      await sendMail({
        to: email,
        subject: `JEE Mentor Application Received - ${applicationId}`,
        text: `Dear ${fullName},\n\nThank you for applying to become a verified mentor on the JEE Preparation Platform.\n\nYour application has been received with Application ID: ${applicationId}.\nInitial Status: Pending Review\n\nOur academic committee reviews credentials within 48 to 72 hours. If your profile matches our requirements, we will reach out to schedule a brief technical interview and platform walkthrough.\n\nYou can track your application status at any time on the portal.\n\nBest regards,\nJEE Preparation Platform Academic Team`,
        html: `
          <div style="font-family: sans-serif; color: #18223c; max-width: 600px; margin: 0 auto; line-height: 1.6;">
            <div style="background-color: #f7f5ff; padding: 24px; border-radius: 16px; border: 1px solid #dcd8fb;">
              <h2 style="color: #6353c6; margin-top: 0;">Application Received</h2>
              <p>Dear <strong>${fullName}</strong>,</p>
              <p>Thank you for applying to become a verified mentor on the <strong>JEE Preparation Platform</strong>.</p>
              <div style="background: white; border: 1px solid #dfe5ef; padding: 16px; border-radius: 12px; margin: 20px 0;">
                <p style="margin: 4px 0; font-size: 13px; color: #73809b;">Application ID:</p>
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #18223c; font-family: monospace;">${applicationId}</p>
                <p style="margin: 12px 0 4px 0; font-size: 13px; color: #73809b;">Initial Status:</p>
                <p style="margin: 0; font-size: 15px; font-weight: bold; color: #b45309;">⏳ Pending Review</p>
              </div>
              <p>Our academic committee reviews qualifications within 48–72 hours. Once reviewed, you will receive updates regarding next steps and technical interview scheduling.</p>
              <hr style="border: 0; border-top: 1px solid #e4e8f1; margin: 24px 0;" />
              <p style="font-size: 12px; color: #8a96ad; margin: 0;">JEE Preparation Platform · Mentorship Network</p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.warn("Applicant confirmation email delivery note:", emailErr.message);
    }

    return NextResponse.json({
      ok: true,
      id: insertedId,
      applicationId,
      status: "Pending",
      createdAt: new Date().toISOString(),
      message: "Application submitted successfully.",
    });
  } catch (error) {
    console.error("Mentor application submission failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit application. Please try again." },
      { status: 500 }
    );
  }
}

