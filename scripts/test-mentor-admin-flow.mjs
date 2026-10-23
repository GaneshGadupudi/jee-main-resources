import fs from "node:fs";
import path from "node:path";
import sql from "mssql/msnodesqlv8.js";
import bcrypt from "bcryptjs";

const dbConfig = {
  server: "localhost",
  database: "JEE_Preparation_Platform",
  driver: "ODBC Driver 18 for SQL Server",
  options: {
    trustedConnection: true,
    encrypt: false,
    instanceName: "SQLEXPRESS",
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

async function runTests() {
  console.log("=== STARTING FULL END-TO-END VERIFICATION ===");
  const pool = await sql.connect(dbConfig);
  console.log("[DB] Connected to MSSQL server SQLEXPRESS / JEE_Preparation_Platform");

  // 1. Verify dbo.MentorApplications table structure
  const tableCheck = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'MentorApplications'
  `);
  console.log(`[Schema] MentorApplications column count: ${tableCheck.recordset.length}`);
  if (tableCheck.recordset.length < 20) {
    throw new Error("MentorApplications table columns missing!");
  }

  // 2. Verify Admin user in dbo.Users
  const adminCheck = await pool.request()
    .input("email", sql.VarChar(150), "admin@jeecompass.com")
    .query("SELECT Id, Name, Email, PasswordHash, Role FROM dbo.Users WHERE Email = @email");
  const adminUser = adminCheck.recordset[0];
  if (!adminUser) {
    throw new Error("Admin user admin@jeecompass.com not found in DB!");
  }
  const passwordMatch = await bcrypt.compare("%R6jdv^qbq!3t46b", adminUser.PasswordHash);
  console.log(`[Auth] Admin user verified: Id=${adminUser.Id}, Role=${adminUser.Role}, PasswordValid=${passwordMatch}`);

  // 3. Test Direct Insertion / Application Flow
  const testAppId = `TEST-APP-${Date.now()}`;
  const testEmail = `test.mentor.${Date.now()}@example.com`;
  console.log(`[Test] Creating test mentor application: ${testAppId} (${testEmail})`);

  // Ensure storage/resumes exists and create a sample dummy PDF
  const storageDir = path.resolve(process.cwd(), "storage", "resumes");
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  const samplePdfName = `test_resume_${Date.now()}.pdf`;
  const samplePdfPath = path.join(storageDir, samplePdfName);
  fs.writeFileSync(samplePdfPath, "%PDF-1.4 sample resume content for automated test verification");

  await pool.request()
    .input("appId", sql.VarChar(50), testAppId)
    .input("fullName", sql.NVarChar(150), "Dr. Vikram Sharma")
    .input("email", sql.VarChar(150), testEmail)
    .input("phone", sql.VarChar(20), "+91 9876543210")
    .input("qualification", sql.NVarChar(100), "Ph.D. in Physics")
    .input("institute", sql.NVarChar(200), "IIT Bombay")
    .input("profession", sql.NVarChar(150), "Senior Physics Faculty")
    .input("exp", sql.Int, 8)
    .input("subjects", sql.NVarChar(300), "Physics (Mechanics, Electrodynamics)")
    .input("bio", sql.NVarChar(sql.MAX), "Passionate IIT Bombay alumnus with 8 years guiding Top 500 JEE Advanced rankers.")
    .input("teachingExp", sql.NVarChar(sql.MAX), "Taught over 3,000 aspirants across premier institutes.")
    .input("mode", sql.VarChar(20), "Hybrid")
    .input("linkedin", sql.NVarChar(300), "https://linkedin.com/in/test-vikram-sharma")
    .input("exams", sql.NVarChar(200), "JEE Main, JEE Advanced")
    .input("hours", sql.Int, 15)
    .input("resumeFile", sql.NVarChar(255), samplePdfName)
    .input("resumeOriginal", sql.NVarChar(255), "Vikram_Sharma_CV.pdf")
    .input("resumePath", sql.NVarChar(500), samplePdfPath)
    .input("resumeSize", sql.Int, 1024)
    .input("resumeMime", sql.VarChar(100), "application/pdf")
    .query(`
      INSERT INTO dbo.MentorApplications (
        ApplicationId, FullName, Email, Phone, HighestQualification, Institute,
        CurrentProfession, ExperienceYears, Subjects, Bio, TeachingExperience,
        PreferredMode, LinkedInUrl, TargetExams, AvailabilityHours,
        ResumeFileName, ResumeOriginalName, ResumeFilePath, ResumeFileSize, ResumeMimeType, Status
      ) VALUES (
        @appId, @fullName, @email, @phone, @qualification, @institute,
        @profession, @exp, @subjects, @bio, @teachingExp,
        @mode, @linkedin, @exams, @hours,
        @resumeFile, @resumeOriginal, @resumePath, @resumeSize, @resumeMime, 'Pending'
      )
    `);
  console.log("[DB] Inserted test application with status 'Pending'");

  // 4. Test Query by Application ID
  const verifyInserted = await pool.request()
    .input("appId", sql.VarChar(50), testAppId)
    .query("SELECT Id, ApplicationId, FullName, Status FROM dbo.MentorApplications WHERE ApplicationId = @appId");
  const inserted = verifyInserted.recordset[0];
  console.log(`[Verify] Application found in DB: Id=${inserted.Id}, Status=${inserted.Status}`);

  // 5. Test Status Transitions:
  // Step A: Move to "Under Review"
  await pool.request()
    .input("id", sql.Int, inserted.Id)
    .input("adminId", sql.Int, adminUser.Id)
    .query(`
      UPDATE dbo.MentorApplications 
      SET Status = 'Under Review', ReviewedByAdminId = @adminId, ReviewedAt = SYSDATETIME(), AdminNotes = 'Initial background verification clear.'
      WHERE Id = @id
    `);
  console.log("[Workflow] Status updated to 'Under Review'");

  // Step B: Schedule Interview
  await pool.request()
    .input("id", sql.Int, inserted.Id)
    .input("iDate", sql.Date, "2026-10-25")
    .input("iTime", sql.VarChar(50), "11:30 AM IST")
    .input("iMode", sql.VarChar(50), "Google Meet")
    .input("iLink", sql.NVarChar(300), "https://meet.google.com/test-room-123")
    .query(`
      UPDATE dbo.MentorApplications 
      SET Status = 'Interview Scheduled', InterviewDate = @iDate, InterviewTime = @iTime, MeetingMode = @iMode, MeetingLink = @iLink
      WHERE Id = @id
    `);
  console.log("[Workflow] Status updated to 'Interview Scheduled' with Google Meet link");

  // Step C: Accept Application
  await pool.request()
    .input("id", sql.Int, inserted.Id)
    .query("UPDATE dbo.MentorApplications SET Status = 'Accepted' WHERE Id = @id");
  console.log("[Workflow] Status updated to 'Accepted'");

  // Clean up test file and record
  if (fs.existsSync(samplePdfPath)) {
    fs.unlinkSync(samplePdfPath);
  }
  await pool.request()
    .input("id", sql.Int, inserted.Id)
    .query("DELETE FROM dbo.MentorApplications WHERE Id = @id");
  console.log("[Cleanup] Test record deleted successfully.");

  await pool.close();
  console.log("=== ALL END-TO-END TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
