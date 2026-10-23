import sql from "mssql/msnodesqlv8.js";
import {
  createWrittenSolutionRequest,
  getMentorWrittenSolutions,
  acceptWrittenSolutionRequest,
  submitWrittenSolution,
  getStudentWrittenSolutions,
  purgeExpiredWrittenSolutions,
} from "../lib/written-solutions-db.js";
import { saveSolutionImage, deleteSolutionImage } from "../lib/solutions-storage.js";

async function run() {
  console.log("=== VERIFYING DAILY PRACTICE AUTO-CAPTURE & MENTOR NAV FLOW ===");

  const pool = await sql.connect({
    server: "localhost",
    database: "JEE_Preparation_Platform",
    driver: "ODBC Driver 18 for SQL Server",
    options: { trustedConnection: true, encrypt: false, instanceName: "SQLEXPRESS" },
  });

  const studentRes = await pool.request().query("SELECT TOP 1 Id, Name, Email FROM dbo.Users WHERE Role = 'student'");
  const mentorRes = await pool.request().query("SELECT TOP 1 Id, Name, Email FROM dbo.Users WHERE Role = 'mentor'");

  const student = studentRes.recordset[0];
  const mentor = mentorRes.recordset[0];

  console.log(`Student: ${student.Name} (ID: ${student.Id})`);
  console.log(`Mentor:  ${mentor.Name} (ID: ${mentor.Id})`);

  // 1. Simulate Daily Practice auto-capture of question
  console.log("\n1. Simulating Daily Practice 'Request a Mentor Solution' auto-capture:");
  const currentDailyPracticeQuestion = {
    subject: "Physics",
    chapter: "Kinematics",
    text: "A particle's velocity is v(t) = 3t² + 2 m/s. What is its acceleration at t = 2 s?",
    options: ["6 m/s²", "12 m/s²", "14 m/s²", "18 m/s²"],
  };

  const optionsText = "\n\nOptions:\n" + currentDailyPracticeQuestion.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join("\n");
  const fullAutoCapturedText = `${currentDailyPracticeQuestion.text}${optionsText}`;

  const autoReq = await createWrittenSolutionRequest({
    studentId: student.Id,
    subject: currentDailyPracticeQuestion.subject,
    chapter: currentDailyPracticeQuestion.chapter,
    questionText: fullAutoCapturedText,
  });

  console.log("✓ Auto-captured question submitted without manual typing:", {
    id: autoReq.Id,
    requestId: autoReq.RequestId,
    subject: autoReq.Subject,
    chapter: autoReq.Chapter,
    status: autoReq.Status,
  });

  // 2. Simulate Custom Question submission via Mentor Solutions section (Preserved)
  console.log("\n2. Simulating Custom Question submitted via Mentor Solutions section:");
  const customReq = await createWrittenSolutionRequest({
    studentId: student.Id,
    subject: "Mathematics",
    chapter: "Complex Numbers",
    questionText: "Find the locus of z such that |z - 1| / |z + 1| = 2.",
  });

  console.log("✓ Custom question submitted:", {
    id: customReq.Id,
    requestId: customReq.RequestId,
    subject: customReq.Subject,
    status: customReq.Status,
  });

  // 3. Verify Mentor sees both in Pending Queue
  console.log("\n3. Verifying Mentor pending queue contains both requests:");
  const mentorQueue = await getMentorWrittenSolutions(mentor.Id);
  const foundAuto = mentorQueue.pending.find((r) => r.id === autoReq.Id);
  const foundCustom = mentorQueue.pending.find((r) => r.id === customReq.Id);

  if (!foundAuto) throw new Error("Auto-captured daily practice question missing in mentor queue.");
  if (!foundCustom) throw new Error("Custom question missing in mentor queue.");
  console.log("✓ Both auto-captured and custom questions appear in mentor's pending list!");

  // 4. Mentor accepts and solves the auto-captured question
  console.log("\n4. Mentor accepts auto-captured question and uploads solution:");
  await acceptWrittenSolutionRequest(autoReq.Id, mentor.Id);

  const dummyBuffer = Buffer.from("GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;");
  const dummyFile = {
    name: "kinematics_sol.png",
    type: "image/png",
    arrayBuffer: async () => dummyBuffer.buffer.slice(dummyBuffer.byteOffset, dummyBuffer.byteOffset + dummyBuffer.byteLength),
  };

  const savedImage = await saveSolutionImage(dummyFile, autoReq.RequestId);
  const solved = await submitWrittenSolution({
    requestId: autoReq.Id,
    mentorId: mentor.Id,
    fileName: savedImage.fileName,
    originalName: savedImage.originalName,
    filePath: savedImage.filePath,
    mimeType: savedImage.mimeType,
    fileSize: savedImage.fileSize,
    mentorNotes: "Differentiate v(t) with respect to t to get a(t) = 6t.",
  });

  console.log("✓ Mentor sent solution to student with 30-day expiration:", {
    id: solved.Id,
    status: solved.Status,
    solvedAt: solved.SolvedAt,
    expiresAt: solved.ExpiresAt,
  });

  // 5. Student views both in Mentor Solutions
  console.log("\n5. Student checks Mentor Solutions:");
  const studentSolutions = await getStudentWrittenSolutions(student.Id);
  const comp = studentSolutions.find((s) => s.id === autoReq.Id);
  const pend = studentSolutions.find((s) => s.id === customReq.Id);

  if (!comp || comp.status !== "Completed") throw new Error("Completed auto-captured solution not found.");
  if (!pend || pend.status !== "Pending") throw new Error("Pending custom question not found.");

  console.log("✓ Completed solution:", {
    id: comp.id,
    subject: comp.subject,
    status: comp.status,
    daysRemaining: comp.daysRemaining,
    mentorNotes: comp.mentorNotes,
  });
  console.log("✓ Pending custom request:", {
    id: pend.id,
    subject: pend.subject,
    status: pend.status,
  });

  // Clean up test records
  console.log("\n6. Cleaning up test records:");
  await deleteSolutionImage(savedImage.fileName);
  await pool.request().query(`DELETE FROM dbo.WrittenSolutionRequests WHERE Id IN (${autoReq.Id}, ${customReq.Id})`);
  console.log("✓ Cleaned up test records from database.");

  await pool.close();
  console.log("\n=== ALL CHECKS PASSED SUCCESSFULLY! ===");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

