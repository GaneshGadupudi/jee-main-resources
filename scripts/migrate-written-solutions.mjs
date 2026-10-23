import fs from "node:fs";
import path from "node:path";
import sql from "mssql/msnodesqlv8.js";

async function run() {
  const dbConfig = {
    server: "localhost",
    database: "JEE_Preparation_Platform",
    driver: "ODBC Driver 18 for SQL Server",
    options: { trustedConnection: true, encrypt: false, instanceName: "SQLEXPRESS" }
  };

  const pool = await sql.connect(dbConfig);
  const sqlFile = path.resolve(process.cwd(), "database", "WrittenSolutionRequests.sql");
  const sqlText = fs.readFileSync(sqlFile, "utf8");

  await pool.request().batch(sqlText);
  console.log("Migration executed successfully!");

  const check = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'WrittenSolutionRequests'
  `);

  console.log(`Columns created: ${check.recordset.length}`);
  await pool.close();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

