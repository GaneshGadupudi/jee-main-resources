import fs from "node:fs/promises";
import path from "node:path";
import sql from "mssql/msnodesqlv8.js";
import {
  createWrittenSolutionRequest,
  getMentorWrittenSolutions,
  acceptWrittenSolutionRequest,
  submitWrittenSolution,
  getStudentWrittenSolutions,
  purgeExpiredWrittenSolutions,
  getWrittenSolutionById,
} from "../lib/written-solutions-db.js";
import {
  saveSolutionImage,
  getSolutionImageBuffer,
  deleteSolutionImage,
} from "../lib/solutions-storage.js";

async function run() {
  console.log("=== STARTING WRITTEN SOLUTIONS END-TO-END TEST ===");

  const pool = await sql.connect({
    server: "localhost",
    database: "JEE_Preparation_Platform",
    driver: "ODBC Driver 18 for SQL Server",
    options: { trustedConnection: true, encrypt: false, instanceName: "SQLEXPRESS" },
  });

  // 1. Get sample student and mentor
  const studentRes = await pool.request().query("SELECT TOP 1 Id, Name, Email FROM dbo.Users WHERE Role = 'student'");
  const mentorRes = await pool.request().query("SELECT TOP 1 Id, Name, Email FROM dbo.Users WHERE Role = 'mentor'");

  if (!studentRes.recordset.length || !mentorRes.recordset.length) {
    throw new Error("Missing test student or mentor in database.");
  }

  const student = studentRes.recordset[0];
  const mentor = mentorRes.recordset[0];

  console.log(`Using Student: ${student.Name} (ID: ${student.Id}, Email: ${student.Email})`);
  console.log(`Using Mentor:  ${mentor.Name} (ID: ${mentor.Id}, Email: ${mentor.Email})`);

  // Step 1: Student creates a request
  console.log("\n--- Step 1: Student submits a written solution request ---");
  const testQuestion = "Derive the moment of inertia of a uniform solid sphere of radius R and mass M about its diameter.";
  const created = await createWrittenSolutionRequest({
    studentId: student.Id,
    subject: "Physics",
    chapter: "Rotational Dynamics",
    questionText: testQuestion,
  });

  console.log("✓ Request created:", {
    Id: created.Id,
    RequestId: created.RequestId,
    Status: created.Status,
    Subject: created.Subject,
    Chapter: created.Chapter,
  });

  if (created.Status !== "Pending") {
    throw new Error(`Expected status 'Pending', got '${created.Status}'`);
  }

  // Step 2: Mentor views pending queue
  console.log("\n--- Step 2: Mentor views pending queue ---");
  const mentorDataBefore = await getMentorWrittenSolutions(mentor.Id);
  const foundPending = mentorDataBefore.pending.find((r) => r.id === created.Id);
  if (!foundPending) {
    throw new Error(`Created request ${created.Id} not found in mentor pending queue.`);
  }
  console.log(`✓ Request found in mentor pending queue (Total pending: ${mentorDataBefore.pending.length})`);

  // Step 3: Mentor accepts the request
  console.log("\n--- Step 3: Mentor accepts the request ---");
  const accepted = await acceptWrittenSolutionRequest(created.Id, mentor.Id);
  if (!accepted || accepted.Status !== "Assigned") {
    throw new Error("Failed to accept request.");
  }
  console.log("✓ Request accepted by mentor. Status is now 'Assigned'.");

  const mentorDataAssigned = await getMentorWrittenSolutions(mentor.Id);
  const foundAssigned = mentorDataAssigned.assigned.find((r) => r.id === created.Id);
  if (!foundAssigned) {
    throw new Error("Request not found in mentor assigned list.");
  }
  console.log(`✓ Verified request in mentor 'assigned' queue.`);

  // Step 4: Mentor prepares handwritten solution and uploads photo
  console.log("\n--- Step 4: Mentor uploads handwritten solution photo and sends to student ---");
  // Create a dummy image buffer for testing
  const dummyBuffer = Buffer.from("GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"); // 1x1 valid GIF image
  const dummyFile = {
    name: "handwritten_sphere_solution.png",
    type: "image/png",
    arrayBuffer: async () => dummyBuffer.buffer.slice(dummyBuffer.byteOffset, dummyBuffer.byteOffset + dummyBuffer.byteLength),
  };

  const savedImage = await saveSolutionImage(dummyFile, created.RequestId);
  console.log("✓ Solution image saved to storage:", savedImage.fileName, `(${savedImage.fileSize} bytes)`);

  const submitted = await submitWrittenSolution({
    requestId: created.Id,
    mentorId: mentor.Id,
    fileName: savedImage.fileName,
    originalName: savedImage.originalName,
    filePath: savedImage.filePath,
    mimeType: savedImage.mimeType,
    fileSize: savedImage.fileSize,
    mentorNotes: "Divide into infinitesimal disks perpendicular to the diameter and integrate.",
  });

  if (!submitted || submitted.Status !== "Completed") {
    throw new Error("Failed to mark solution as completed.");
  }

  console.log("✓ Solution completed in database:", {
    Id: submitted.Id,
    Status: submitted.Status,
    SolvedAt: submitted.SolvedAt,
    ExpiresAt: submitted.ExpiresAt,
  });

  // Verify 30-day expiration window
  const solvedTime = new Date(submitted.SolvedAt).getTime();
  const expireTime = new Date(submitted.ExpiresAt).getTime();
  const diffDays = Math.round((expireTime - solvedTime) / (1000 * 60 * 60 * 24));
  console.log(`✓ Verified 30-day expiration calculation: exactly ${diffDays} days from SolvedAt!`);
  if (diffDays !== 30) {
    throw new Error(`Expected 30 days expiration, got ${diffDays}`);
  }

  // Step 5: Student views completed solution
  console.log("\n--- Step 5: Student views Mentor Solutions ---");
  const studentSolutions = await getStudentWrittenSolutions(student.Id);
  const studentSol = studentSolutions.find((s) => s.id === created.Id);
  if (!studentSol) {
    throw new Error("Completed solution not found in student's Mentor Solutions.");
  }
  console.log("✓ Student received completed solution:", {
    id: studentSol.id,
    subject: studentSol.subject,
    status: studentSol.status,
    hasSolution: studentSol.hasSolution,
    solutionImageUrl: studentSol.solutionImageUrl,
    daysRemaining: studentSol.daysRemaining,
    mentorName: studentSol.mentor?.name,
  });

  if (studentSol.daysRemaining !== 30) {
    throw new Error(`Expected 30 days remaining, got ${studentSol.daysRemaining}`);
  }

  // Step 6: Verify secure file access
  console.log("\n--- Step 6: Verify secure image retrieval from storage ---");
  const fileCheck = await getSolutionImageBuffer(savedImage.fileName);
  if (!fileCheck || fileCheck.buffer.length !== dummyBuffer.length) {
    throw new Error("Failed to retrieve stored solution image buffer.");
  }
  console.log("✓ Image buffer successfully read from storage/solutions/ !");

  // Step 7: Test 30-Day Expiration Purge Routine
  console.log("\n--- Step 7: Test 30-Day Expiration Purge Routine ---");
  // Insert an artificially expired solution (e.g. Expired yesterday)
  const expiredReq = await createWrittenSolutionRequest({
    studentId: student.Id,
    subject: "Chemistry",
    chapter: "Thermodynamics",
    questionText: "Calculate entropy change for reversible isothermal expansion of ideal gas.",
  });

  const dummyExpiredImage = await saveSolutionImage(dummyFile, expiredReq.RequestId);

  // Manually backdate ExpiresAt to 1 day ago
  await pool.request()
    .input("id", sql.Int, expiredReq.Id)
    .input("fileName", sql.NVarChar(255), dummyExpiredImage.fileName)
    .query(`
      UPDATE dbo.WrittenSolutionRequests
      SET
        Status = 'Completed',
        SolutionImageFileName = @fileName,
        SolvedAt = DATEADD(day, -31, SYSUTCDATETIME()),
        ExpiresAt = DATEADD(day, -1, SYSUTCDATETIME())
      WHERE Id = @id
    `);

  console.log("Inserted mock expired solution with ExpiresAt = 1 day ago.");

  // Run purge routine
  const purgedCount = await purgeExpiredWrittenSolutions();
  console.log(`✓ Purge executed: ${purgedCount} expired records cleaned up.`);

  if (purgedCount < 1) {
    throw new Error("Purge routine failed to clean up the expired record.");
  }

  // Verify expired file was deleted from disk
  const expiredFileCheck = await getSolutionImageBuffer(dummyExpiredImage.fileName);
  if (expiredFileCheck !== null) {
    throw new Error("Expired image file still exists on disk!");
  }
  console.log("✓ Confirmed expired image file was deleted from disk!");

  // Verify valid solution is STILL intact
  const validFileCheck = await getSolutionImageBuffer(savedImage.fileName);
  if (!validFileCheck) {
    throw new Error("Valid active solution was mistakenly deleted!");
  }
  console.log("✓ Confirmed valid active solution remains intact!");

  // Clean up our active test record & file
  console.log("\n--- Cleaning up active test record ---");
  await deleteSolutionImage(savedImage.fileName);
  await pool.request().input("id", sql.Int, created.Id).query("DELETE FROM dbo.WrittenSolutionRequests WHERE Id = @id");
  console.log("✓ Test cleanup completed.");

  await pool.close();
  console.log("\n=== ALL WRITTEN SOLUTIONS TESTS PASSED SUCCESSFULLY! ===");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

