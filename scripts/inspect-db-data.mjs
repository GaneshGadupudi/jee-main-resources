import sql from "mssql/msnodesqlv8.js";

async function inspect() {
  const pool = await sql.connect({
    server: "localhost",
    database: "JEE_Preparation_Platform",
    driver: "ODBC Driver 18 for SQL Server",
    options: { trustedConnection: true, encrypt: false, instanceName: "SQLEXPRESS" }
  });

  const tables = await pool.request().query(`
    SELECT t.name AS TableName, p.rows AS RowCounts
    FROM sys.tables t
    JOIN sys.partitions p ON t.object_id = p.object_id
    WHERE p.index_id IN (0,1)
    ORDER BY t.name
  `);
  console.log("=== TABLES AND ROW COUNTS ===");
  for (const row of tables.recordset) {
    console.log(`${row.TableName.padEnd(30)} : ${row.RowCounts} rows`);
  }

  // Specifically check MentorApplications
  const mentorApps = await pool.request().query("SELECT Id, ApplicationId, FullName, Email, Status, CreatedAt FROM dbo.MentorApplications");
  console.log("\n=== dbo.MentorApplications ===");
  console.table(mentorApps.recordset);

  // Specifically check PYQ related tables
  // Let's see what PYQ tables exist
  const pyqTables = tables.recordset.filter(t => t.TableName.toLowerCase().includes("pyq") || t.TableName.toLowerCase().includes("question"));
  for (const pt of pyqTables) {
    console.log(`\n=== Table: ${pt.TableName} ===`);
    const qRes = await pool.request().query(`SELECT TOP 10 * FROM dbo.[${pt.TableName}]`);
    console.log(`Total sample records: ${qRes.recordset.length}`);
    if (qRes.recordset.length > 0) {
      console.log("Sample columns:", Object.keys(qRes.recordset[0]));
      // Check status of questions if any
      if ("Status" in qRes.recordset[0]) {
        const statusCount = await pool.request().query(`SELECT Status, COUNT(*) as cnt FROM dbo.[${pt.TableName}] GROUP BY Status`);
        console.log("Status distribution:", statusCount.recordset);
      }
    }
  }

  // Check Doubt / MentorRequests tables
  const doubtTables = tables.recordset.filter(t => t.TableName.toLowerCase().includes("request") || t.TableName.toLowerCase().includes("doubt"));
  for (const dt of doubtTables) {
    console.log(`\n=== Table: ${dt.TableName} ===`);
    const dRes = await pool.request().query(`SELECT TOP 10 * FROM dbo.[${dt.TableName}]`);
    console.log(`Total records: ${dt.RowCounts}`);
    if (dRes.recordset.length > 0) {
      console.log("Sample columns:", Object.keys(dRes.recordset[0]));
    }
  }

  // Check Users table to ensure admin and users are identified
  const users = await pool.request().query("SELECT Id, Name, Email, Role, CreatedAt FROM dbo.Users");
  console.log("\n=== dbo.Users (MUST BE PRESERVED) ===");
  console.table(users.recordset);

  await pool.close();
}

inspect().catch(console.error);

