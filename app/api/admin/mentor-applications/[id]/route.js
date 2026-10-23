import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { adminRoute } from "@/lib/admin";
import { getDb, sql } from "@/lib/db";
import { HttpError } from "@/lib/api-user";
import { sendMail } from "@/lib/mailer";
import { createPasswordSetupToken, generateActivationLink } from "@/lib/password-reset";

const VALID_STATUSES = ["Pending", "Under Review", "Interview Scheduled", "Accepted", "Declined"];

function formatApplication(r) {
  return {
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
    interview: r.InterviewDate
      ? {
          date: r.InterviewDate,
          time: r.InterviewTime || "",
          mode: r.MeetingMode || "",
          link: r.MeetingLink || "",
        }
      : null,
    adminNotes: r.AdminNotes || "",
    reviewedAt: r.ReviewedAt,
    reviewedBy: r.ReviewedByAdminName,
    createdAt: r.CreatedAt,
    updatedAt: r.UpdatedAt,
  };
}

// GET - Single mentor application detail
export const GET = adminRoute(async ({ params }) => {
  const id = Number(params?.id);
  if (!id || Number.isNaN(id)) throw new HttpError(400, "Invalid application ID.");

  const pool = await getDb();
  const res = await pool.request()
    .input("id", sql.Int, id)
    .query(`
      SELECT m.*, u.Name AS ReviewedByAdminName
      FROM dbo.MentorApplications m
      LEFT JOIN dbo.Users u ON u.Id = m.ReviewedByAdminId
      WHERE m.Id = @id
    `);

  const r = res.recordset[0];
  if (!r) throw new HttpError(404, "Application not found.");

  return { application: formatApplication(r) };
});

// PATCH - Update application status, schedule interview, or update internal notes
export const PATCH = adminRoute(async ({ admin, params, body }) => {
  const id = Number(params?.id);
  if (!id || Number.isNaN(id)) throw new HttpError(400, "Invalid application ID.");

  const pool = await getDb();

  // Fetch current application state
  const currentRes = await pool.request()
    .input("id", sql.Int, id)
    .query("SELECT TOP (1) * FROM dbo.MentorApplications WHERE Id = @id");

  const current = currentRes.recordset[0];
  if (!current) throw new HttpError(404, "Application not found.");

  const nextStatus = body?.status ? String(body.status).trim() : current.Status;
  if (!VALID_STATUSES.includes(nextStatus)) {
    throw new HttpError(400, `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  const adminNotes = body?.adminNotes !== undefined ? String(body.adminNotes).trim() : current.AdminNotes;

  // Interview scheduling fields
  let interviewDate = current.InterviewDate;
  let interviewTime = current.InterviewTime;
  let meetingMode = current.MeetingMode;
  let meetingLink = current.MeetingLink;

  if (body?.interviewDate !== undefined) {
    interviewDate = body.interviewDate ? new Date(body.interviewDate).toISOString() : null;
  }
  if (body?.interviewTime !== undefined) {
    interviewTime = String(body.interviewTime).trim() || null;
  }
  if (body?.meetingMode !== undefined) {
    meetingMode = String(body.meetingMode).trim() || null;
  }
  if (body?.meetingLink !== undefined) {
    meetingLink = String(body.meetingLink).trim() || null;
  }

  // Update in database
  await pool.request()
    .input("id", sql.Int, id)
    .input("status", sql.VarChar(30), nextStatus)
    .input("adminNotes", sql.NVarChar(sql.MAX), adminNotes || null)
    .input("interviewDate", sql.DateTime2, interviewDate)
    .input("interviewTime", sql.NVarChar(50), interviewTime)
    .input("meetingMode", sql.VarChar(30), meetingMode)
    .input("meetingLink", sql.NVarChar(500), meetingLink)
    .input("reviewedBy", sql.Int, admin.id)
    .query(`
      UPDATE dbo.MentorApplications
      SET Status = @status,
          AdminNotes = @adminNotes,
          InterviewDate = @interviewDate,
          InterviewTime = @interviewTime,
          MeetingMode = @meetingMode,
          MeetingLink = @meetingLink,
          ReviewedByAdminId = @reviewedBy,
          ReviewedAt = SYSUTCDATETIME(),
          UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @id
    `);

  // If application was Accepted: ensure mentor account exists and generate activation link
  let userAccountCreated = false;
  let userRoleUpdated = false;
  let activationLink = null;

  if (nextStatus === "Accepted") {
    const normalizedEmail = current.Email.trim().toLowerCase();

    // 1. Check if user already exists in dbo.Users
    const existingUserRes = await pool.request()
      .input("email", sql.NVarChar(320), normalizedEmail)
      .query("SELECT TOP (1) Id, Name, Email, Role, PasswordHash FROM dbo.Users WHERE Email = @email");

    let targetUserId = null;

    if (existingUserRes.recordset.length > 0) {
      const existingUser = existingUserRes.recordset[0];
      targetUserId = existingUser.Id;
      if (existingUser.Role !== "mentor") {
        await pool.request()
          .input("id", sql.Int, existingUser.Id)
          .query("UPDATE dbo.Users SET Role = 'mentor' WHERE Id = @id");
        userRoleUpdated = true;
      }
    } else {
      // 2. Provision new user account with Role = 'mentor' and a secure random temporary hash
      // The mentor will set their real password through the activation link
      const randomSeed = crypto.randomBytes(32).toString("hex");
      const tempHash = await bcrypt.hash(randomSeed, 12);

      const createUserRes = await pool.request()
        .input("name", sql.NVarChar(200), current.FullName.trim())
        .input("email", sql.NVarChar(320), normalizedEmail)
        .input("passwordHash", sql.NVarChar(255), tempHash)
        .input("role", sql.VarChar(20), "mentor")
        .query(`
          INSERT INTO dbo.Users (Name, Email, PasswordHash, Role)
          OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Email, INSERTED.Role
          VALUES (@name, @email, @passwordHash, @role)
        `);

      targetUserId = createUserRes.recordset[0].Id;
      userAccountCreated = true;
    }

    // 3. Generate a secure, one-time activation / set-password token (valid for 72 hours)
    if (targetUserId) {
      const { token } = await createPasswordSetupToken(targetUserId, 72 * 60);
      activationLink = generateActivationLink(token, process.env.APP_URL);
      console.log(`[MENTOR ACTIVATION LINK for ${current.Email}]: ${activationLink}`);
    }
  }

  // Send email notifications to the applicant (if status changed)
  const statusChanged = nextStatus !== current.Status;
  if (statusChanged && body?.notifyApplicant !== false) {
    try {
      if (nextStatus === "Accepted") {
        const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
        const loginUrl = `${appUrl}/login`;
        const actionUrl = activationLink || loginUrl;

        await sendMail({
          to: current.Email,
          subject: `Congratulations! Your JEE Mentor Application (${current.ApplicationId}) is Accepted`,
          text: `Dear ${current.FullName},\n\nWe are delighted to inform you that your application to become a verified mentor on the JEE Preparation Platform has been ACCEPTED!\n\nTo activate your mentor account and set your password, please use the following secure link (valid for 72 hours):\n${actionUrl}\n\nOnce your password is set, you can sign in to your dashboard at any time with your email (${current.Email}) at:\n${loginUrl}\n\nWelcome to our academic mentoring team!\n\nBest regards,\nJEE Preparation Platform`,
          html: `
            <div style="font-family: sans-serif; color: #18223c; max-width: 600px; margin: 0 auto; line-height: 1.6;">
              <div style="background-color: #eafaf7; padding: 24px; border-radius: 16px; border: 1px solid #a7f3d0;">
                <div style="display: inline-block; background-color: #2c967b; color: white; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
                  Application Approved
                </div>
                <h2 style="color: #247b70; margin-top: 4px; margin-bottom: 14px;">🎉 Application Accepted!</h2>
                <p>Dear <strong>${current.FullName}</strong>,</p>
                <p>We are thrilled to inform you that your mentor application <strong>(${current.ApplicationId})</strong> has been approved by the academic committee!</p>
                <p>You can now access the <strong>Mentor Desk</strong> to conduct 1-on-1 video doubt sessions and provide handwritten step-by-step solutions to JEE aspirants.</p>
                
                <div style="background: white; border: 1px solid #a7f3d0; padding: 18px; border-radius: 12px; margin: 20px 0; text-align: center;">
                  <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #46516b;">Your Mentor Login ID:</p>
                  <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: bold; color: #18223c; font-family: monospace;">${current.Email}</p>
                  <p style="margin: 0 0 14px 0; font-size: 13px; color: #69758d;">Please click below to set your password and activate your mentor account:</p>
                  <a href="${actionUrl}" style="background-color: #2c967b; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                    Set Password & Activate Account
                  </a>
                  <p style="margin: 10px 0 0 0; font-size: 11px; color: #8a96ad;">⏱️ This activation link is valid for 72 hours.</p>
                </div>

                <p style="font-size: 12px; color: #69758d;">If the button does not open, copy and paste this link in your browser:<br/><a href="${actionUrl}" style="color: #2c967b; word-break: break-all;">${actionUrl}</a></p>
                <hr style="border: 0; border-top: 1px solid #a7f3d0; margin: 20px 0;" />
                <p style="font-size: 11px; color: #8a96ad; margin: 0;">JEE Preparation Platform · Mentorship Network</p>
              </div>
            </div>
          `,
        });
      } else if (nextStatus === "Interview Scheduled" && interviewDate) {
        const formattedDate = new Date(interviewDate).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        await sendMail({
          to: current.Email,
          subject: `Interview Scheduled: JEE Mentor Application (${current.ApplicationId})`,
          text: `Dear ${current.FullName},\n\nWe would like to invite you for an interview for your mentor application (${current.ApplicationId}).\n\nDate: ${formattedDate}\nTime: ${interviewTime || "TBD"}\nMode: ${meetingMode || "Online"}\nLink/Location: ${meetingLink || "Will be shared prior to the call"}\n\nWe look forward to meeting you.\n\nBest regards,\nJEE Preparation Platform`,
          html: `
            <div style="font-family: sans-serif; color: #18223c; max-width: 600px; margin: 0 auto; line-height: 1.6;">
              <div style="background-color: #f7f5ff; padding: 24px; border-radius: 16px; border: 1px solid #dcd8fb;">
                <h2 style="color: #6353c6; margin-top: 0;">Interview Scheduled</h2>
                <p>Dear <strong>${current.FullName}</strong>,</p>
                <p>We would like to invite you for an interview regarding your application <strong>(${current.ApplicationId})</strong> to become a mentor.</p>
                <div style="background: white; border: 1px solid #dfe5ef; padding: 16px; border-radius: 12px; margin: 20px 0;">
                  <p style="margin: 4px 0;"><strong>Date:</strong> ${formattedDate}</p>
                  <p style="margin: 4px 0;"><strong>Time:</strong> ${interviewTime || "TBD"}</p>
                  <p style="margin: 4px 0;"><strong>Mode:</strong> ${meetingMode || "Online"}</p>
                  ${meetingLink ? `<p style="margin: 4px 0;"><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>` : ""}
                </div>
                <p>Please prepare to discuss your subject expertise and sample problem-solving approach.</p>
              </div>
            </div>
          `,
        });
      } else if (nextStatus === "Under Review") {
        await sendMail({
          to: current.Email,
          subject: `Application Update: Under Review - ${current.ApplicationId}`,
          text: `Dear ${current.FullName},\n\nYour mentor application (${current.ApplicationId}) has moved to the Under Review stage. Our academic committee is reviewing your credentials.\n\nBest regards,\nJEE Preparation Platform`,
        });
      } else if (nextStatus === "Declined") {
        await sendMail({
          to: current.Email,
          subject: `Update on your JEE Mentor Application (${current.ApplicationId})`,
          text: `Dear ${current.FullName},\n\nThank you for your interest in mentoring on the JEE Preparation Platform. After careful review, we regret to inform you that we cannot proceed with your application at this time.\n\nWe wish you all the best in your professional endeavors.\n\nBest regards,\nJEE Preparation Platform`,
        });
      }
    } catch (e) {
      console.warn("Status change email notice:", e.message);
    }
  }

  // Fetch updated record to return
  const updatedRes = await pool.request()
    .input("id", sql.Int, id)
    .query(`
      SELECT m.*, u.Name AS ReviewedByAdminName
      FROM dbo.MentorApplications m
      LEFT JOIN dbo.Users u ON u.Id = m.ReviewedByAdminId
      WHERE m.Id = @id
    `);

  const updatedRow = updatedRes.recordset[0];

  return {
    ok: true,
    status: nextStatus,
    userRoleUpdated,
    userAccountCreated,
    activationLinkGenerated: Boolean(activationLink),
    application: updatedRow ? formatApplication(updatedRow) : null,
    message: userAccountCreated
      ? `Accepted! Created mentor account for ${current.FullName} and sent activation/password setup link.`
      : userRoleUpdated
      ? `Accepted! Role upgraded to Mentor for ${current.FullName} and activation link sent to ${current.Email}.`
      : `Application updated to '${nextStatus}'.`,
  };
});
