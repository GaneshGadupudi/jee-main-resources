import { getDb, sql } from "@/lib/db";
import { HttpError } from "@/lib/api-user";

// Admin-side data: the mentor-request inbox. Callers must have checked getAdmin() first.

const STATUSES = ["Open", "Assigned", "Closed"];

export async function listMentorRequests(status) {
  const pool = await getDb();
  const request = pool.request();
  let where = "";
  if (status) {
    if (!STATUSES.includes(status)) throw new HttpError(400, "Unknown status.");
    request.input("status", sql.VarChar(10), status);
    where = "WHERE m.Status = @status";
  }
  const rows = (await request.query(`SELECT TOP (200) m.Id, m.UserId, u.Name, u.Email, m.Context, m.Status, m.AssignedTo, m.AdminNote,
    CONVERT(VARCHAR(19), m.CreatedAt, 126) AS CreatedAt, CONVERT(VARCHAR(19), m.UpdatedAt, 126) AS UpdatedAt
    FROM dbo.MentorRequests m JOIN dbo.Users u ON u.Id = m.UserId ${where} ORDER BY m.CreatedAt DESC, m.Id DESC`)).recordset;
  const counts = (await pool.request().query("SELECT Status, COUNT(*) AS N FROM dbo.MentorRequests GROUP BY Status")).recordset;
  return {
    counts: Object.fromEntries(counts.map((c) => [c.Status, Number(c.N)])),
    requests: rows.map((r) => ({
      id: Number(r.Id), studentId: Number(r.UserId), name: r.Name, email: r.Email, context: r.Context || "", status: r.Status,
      assignedTo: r.AssignedTo || "", adminNote: r.AdminNote || "", createdAt: `${r.CreatedAt}Z`, updatedAt: `${r.UpdatedAt}Z`,
    })),
  };
}

// Assigning someone moves the request to Assigned; closing keeps the mentor name for the record.
export async function updateMentorRequest(id, { status, assignedTo, adminNote }) {
  if (!STATUSES.includes(status)) throw new HttpError(400, "Unknown status.");
  const mentor = String(assignedTo || "").trim().slice(0, 100);
  if (status === "Assigned" && !mentor) throw new HttpError(400, "Enter the mentor's name to assign this request.");
  const pool = await getDb();
  const result = await pool.request().input("id", sql.Int, id).input("status", sql.VarChar(10), status).input("mentor", sql.NVarChar(100), mentor || null)
    .input("note", sql.NVarChar(1000), String(adminNote || "").trim().slice(0, 1000) || null)
    .query("UPDATE dbo.MentorRequests SET Status = @status, AssignedTo = @mentor, AdminNote = @note, UpdatedAt = SYSUTCDATETIME() WHERE Id = @id");
  if (!result.rowsAffected[0]) throw new HttpError(404, "Request not found.");
}
