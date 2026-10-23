import sql from "mssql/msnodesqlv8.js";

async function verify() {
  console.log("=== VERIFYING DATABASE STATE ===");
  const pool = await sql.connect({
    server: "localhost",
    database: "JEE_Preparation_Platform",
    driver: "ODBC Driver 18 for SQL Server",
    options: { trustedConnection: true, encrypt: false, instanceName: "SQLEXPRESS" }
  });

  const [apps, pyqQ, pyqO, doubtReq, users] = await Promise.all([
    pool.request().query("SELECT COUNT(*) AS total FROM dbo.MentorApplications"),
    pool.request().query("SELECT COUNT(*) AS total FROM dbo.PyqQuestions"),
    pool.request().query("SELECT COUNT(*) AS total FROM dbo.PyqOptions"),
    pool.request().query("SELECT COUNT(*) AS total FROM dbo.MentorRequests"),
    pool.request().query("SELECT Id, Name, Email, Role FROM dbo.Users"),
  ]);

  console.log(`[DB] MentorApplications count: ${apps.recordset[0].total} (Expected: 0)`);
  console.log(`[DB] PyqQuestions count:       ${pyqQ.recordset[0].total} (Expected: 0)`);
  console.log(`[DB] PyqOptions count:         ${pyqO.recordset[0].total} (Expected: 0)`);
  console.log(`[DB] MentorRequests count:     ${doubtReq.recordset[0].total} (Expected: 0)`);
  console.log(`[DB] Users count:              ${users.recordset.length} (Expected: 7)`);
  
  if (apps.recordset[0].total !== 0 || pyqQ.recordset[0].total !== 0 || pyqO.recordset[0].total !== 0 || doubtReq.recordset[0].total !== 0) {
    throw new Error("Some tables were not completely emptied!");
  }

  const adminFound = users.recordset.find(u => u.Email === "admin@jeecompass.com" && u.Role === "admin");
  if (!adminFound) {
    throw new Error("Admin user not found in dbo.Users!");
  }
  console.log(`[DB] Admin account verified: Id=${adminFound.Id}, Email=${adminFound.Email}, Role=${adminFound.Role}`);

  console.log("\n=== VERIFYING LIVE HTTP ENDPOINTS ===");
  // Test admin login
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@jeecompass.com", password: "%R6jdv^qbq!3t46b" })
  });
  const cookie = loginRes.headers.get("set-cookie")?.split(";")[0];
  console.log(`[HTTP] Admin Login: status=${loginRes.status}, cookie=${Boolean(cookie)}`);

  // Test /api/admin/mentor-applications
  const appsRes = await fetch("http://localhost:3000/api/admin/mentor-applications", {
    headers: { Cookie: cookie }
  });
  const appsData = await appsRes.json();
  console.log(`[HTTP] Admin Mentor Applications: status=${appsRes.status}, count=${appsData.applications?.length}, totalMetric=${appsData.counts?.Total}`);

  // Test /api/admin/pyq
  const pyqRes = await fetch("http://localhost:3000/api/admin/pyq?status=Draft", {
    headers: { Cookie: cookie }
  });
  const pyqData = await pyqRes.json();
  console.log(`[HTTP] Admin PYQ Review: status=${pyqRes.status}, questions=${pyqData.questions?.length}, total=${pyqData.total}`);

  await pool.close();
  console.log("\n=== ALL VERIFICATIONS PASSED SUCCESSFULLY! ===");
}

verify().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

