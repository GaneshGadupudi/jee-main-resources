import fs from "node:fs";
import path from "node:path";
import sql from "mssql/msnodesqlv8.js";

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

async function clearData() {
  console.log("=== IDENTIFYING DATABASE RECORDS TO REMOVE ===");
  const pool = await sql.connect(dbConfig);

  // 1. Check MentorApplications
  const appsBefore = await pool.request().query("SELECT Id, ApplicationId, FullName, Email, Status FROM dbo.MentorApplications");
  console.log(`\n[MentorApplications] Found ${appsBefore.recordset.length} records to remove:`);
  for (const row of appsBefore.recordset) {
    console.log(`  - Id: ${row.Id}, AppId: ${row.ApplicationId}, Name: ${row.FullName}, Email: ${row.Email}, Status: ${row.Status}`);
  }

  // Check files in storage/resumes
  const storageDir = path.resolve(process.cwd(), "storage", "resumes");
  const resumeFiles = fs.existsSync(storageDir) ? fs.readdirSync(storageDir).filter(f => f.endsWith(".pdf")) : [];
  console.log(`\n[Storage] Found ${resumeFiles.length} test resume PDF files in ${storageDir}:`);
  for (const f of resumeFiles) {
    console.log(`  - ${f}`);
  }

  // 2. Check PyqQuestions & PyqOptions
  const questionsBefore = await pool.request().query("SELECT Id, Exam, Year, Shift, Status, QuestionText FROM dbo.PyqQuestions");
  const optionsBefore = await pool.request().query("SELECT COUNT(*) AS total FROM dbo.PyqOptions");
  console.log(`\n[PYQ Review Data] Found ${questionsBefore.recordset.length} questions and ${optionsBefore.recordset[0].total} options to remove:`);
  for (const q of questionsBefore.recordset) {
    console.log(`  - Question #${q.Id} [${q.Status}] (${q.Exam} ${q.Year}): "${q.QuestionText?.substring(0, 50)}..."`);
  }

  // 3. Check MentorRequests
  const requestsBefore = await pool.request().query("SELECT Id, UserId, Status, Context FROM dbo.MentorRequests");
  console.log(`\n[MentorRequests] Found ${requestsBefore.recordset.length} sample doubt records to remove:`);
  for (const r of requestsBefore.recordset) {
    console.log(`  - Request #${r.Id} (User ${r.UserId}): "${r.Context?.substring(0, 50)}..."`);
  }

  // 4. Verify Users that MUST BE PRESERVED
  const usersCheck = await pool.request().query("SELECT Id, Name, Email, Role FROM dbo.Users");
  console.log(`\n[Preserved Users] Confirmed ${usersCheck.recordset.length} user accounts will NOT be touched:`);
  for (const u of usersCheck.recordset) {
    console.log(`  - Id: ${u.Id}, Name: ${u.Name}, Email: ${u.Email}, Role: ${u.Role}`);
  }

  console.log("\n=== EXECUTING CLEANUP ===");

  // Perform removals
  const delOptions = await pool.request().query("DELETE FROM dbo.PyqOptions");
  console.log(`[Cleared] Deleted ${delOptions.rowsAffected[0]} rows from dbo.PyqOptions`);

  const delQuestions = await pool.request().query("DELETE FROM dbo.PyqQuestions");
  console.log(`[Cleared] Deleted ${delQuestions.rowsAffected[0]} rows from dbo.PyqQuestions`);

  const delApps = await pool.request().query("DELETE FROM dbo.MentorApplications");
  console.log(`[Cleared] Deleted ${delApps.rowsAffected[0]} rows from dbo.MentorApplications`);

  const delRequests = await pool.request().query("DELETE FROM dbo.MentorRequests");
  console.log(`[Cleared] Deleted ${delRequests.rowsAffected[0]} rows from dbo.MentorRequests`);

  // Delete resume files
  let deletedFiles = 0;
  for (const f of resumeFiles) {
    const filePath = path.join(storageDir, f);
    try {
      fs.unlinkSync(filePath);
      deletedFiles++;
    } catch (err) {
      console.warn(`Could not delete ${f}:`, err.message);
    }
  }
  console.log(`[Cleared] Deleted ${deletedFiles} test resume PDF files from storage/resumes/`);

  // Verification after cleanup
  console.log("\n=== POST-CLEANUP VERIFICATION ===");
  const appsAfter = await pool.request().query("SELECT COUNT(*) AS total FROM dbo.MentorApplications");
  const questionsAfter = await pool.request().query("SELECT COUNT(*) AS total FROM dbo.PyqQuestions");
  const optionsAfter = await pool.request().query("SELECT COUNT(*) AS total FROM dbo.PyqOptions");
  const requestsAfter = await pool.request().query("SELECT COUNT(*) AS total FROM dbo.MentorRequests");
  const usersAfter = await pool.request().query("SELECT COUNT(*) AS total FROM dbo.Users");

  console.log(`dbo.MentorApplications: ${appsAfter.recordset[0].total} rows`);
  console.log(`dbo.PyqQuestions:       ${questionsAfter.recordset[0].total} rows`);
  console.log(`dbo.PyqOptions:         ${optionsAfter.recordset[0].total} rows`);
  console.log(`dbo.MentorRequests:     ${requestsAfter.recordset[0].total} rows`);
  console.log(`dbo.Users:              ${usersAfter.recordset[0].total} rows (all preserved)`);

  await pool.close();
  console.log("\n=== CLEANUP COMPLETED SUCCESSFULLY ===");
}

clearData().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});

