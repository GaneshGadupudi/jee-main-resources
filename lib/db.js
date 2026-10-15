import sql from "mssql/msnodesqlv8";

const config = {
  server: process.env.MSSQL_SERVER || "localhost",
  database: process.env.MSSQL_DATABASE || "JEE_Preparation_Platform",
  driver: process.env.MSSQL_ODBC_DRIVER || "ODBC Driver 18 for SQL Server",
  options: {
    trustedConnection: true,
    encrypt: false,
    instanceName: process.env.MSSQL_INSTANCE || "SQLEXPRESS",
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

let poolPromise;

export function getDb() {
  if (!poolPromise) {
    poolPromise = sql.connect(config).catch((error) => {
      poolPromise = undefined;
      throw new Error(`Unable to connect to MS SQL Server: ${error.message}`);
    });
  }
  return poolPromise;
}

export const connectToDb = getDb;
export { sql };
