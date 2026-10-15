import { connectToDb } from '@/lib/db';

export async function GET() {
  try {
    // 1. Connects to your local SSMS database using Windows Auth & Named Pipes
    const pool = await connectToDb();

    // 2. Runs a simple SQL query to ask SQL Server for its version info
    const result = await pool.request().query('SELECT @@VERSION as version');

    // 3. Returns the result as JSON to your browser
    return Response.json({ success: true, version: result.recordset[0] });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}