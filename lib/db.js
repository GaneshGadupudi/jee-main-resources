import sql from 'mssql';

const config = {
  server: 'localhost',
  database: 'JEE_Preparation_Platform',
  options: {
    trustServerCertificate: true,
    trustedConnection: true, // Uses Windows Authentication
    instanceName: 'SQLEXPRESS', // Crucial for local Express named instances
    enableArithAbort: true
  }
};

let pool;

export async function connectToDb() {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}