import { getDb, sql } from "@/lib/db";

// Ranking for a weekly contest.
//   Pool: each student's FIRST live (non-virtual) submission, so retakes can't improve a rank.
//   Rank: highest score first; ties are split by the faster time, and equal score + time share a rank.
//   Percentile (NTA style): share of the live participants who scored the same or lower, so the top scorer of a full field is ~100.
//   A virtual attempt (a past contest taken later) is placed against the live pool without joining it.

export const maskName =(name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Student";
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts.at(-1)[0].toUpperCase()}.`;
};

export async function getLeaderboard(userId, contestKey) {
  const pool = await getDb();
  const live = (await pool.request().input("k", sql.NVarChar(100), contestKey).query(`
    WITH first_attempt AS (
      SELECT t.UserId, t.Score, t.Accuracy, t.TimeTakenMs, ROW_NUMBER() OVER (PARTITION BY t.UserId ORDER BY t.SubmittedAt, t.Id) AS rn
      FROM dbo.TestAttempts t WHERE t.TestType = 'contest' AND t.TestKey = @k AND t.Status = 'Submitted' AND t.IsVirtual = 0)
    SELECT f.UserId, u.Name, f.Score, f.Accuracy, f.TimeTakenMs, RANK() OVER (ORDER BY f.Score DESC, f.TimeTakenMs ASC) AS Rnk
    FROM first_attempt f JOIN dbo.Users u ON u.Id = f.UserId WHERE f.rn = 1 ORDER BY Rnk, f.UserId`)).recordset
    .map((r) => ({ userId: Number(r.UserId), name: r.Name, score: Number(r.Score), accuracy: Number(r.Accuracy), timeMs: Number(r.TimeTakenMs), rank: Number(r.Rnk) }));

  const participants = live.length;
  const percentile = (score) => (participants ? Math.round((live.filter((r) => r.score <= score).length / participants) * 10000) / 100 : null);

  let me = null;
  const mine = live.find((r) => r.userId === userId);
  if (mine) {
    me = { rank: mine.rank, score: mine.score, accuracy: mine.accuracy, timeMs: mine.timeMs, percentile: percentile(mine.score), virtual: false };
  } else {
    const best = (await pool.request().input("u", sql.Int, userId).input("k", sql.NVarChar(100), contestKey).query(`
      SELECT TOP (1) Score, Accuracy, TimeTakenMs FROM dbo.TestAttempts
      WHERE UserId = @u AND TestType = 'contest' AND TestKey = @k AND Status = 'Submitted' ORDER BY Score DESC, TimeTakenMs ASC`)).recordset[0];
    if (best) {
      const score = Number(best.Score);
      const timeMs = Number(best.TimeTakenMs);
      const ahead = live.filter((r) => r.score > score || (r.score === score && r.timeMs < timeMs)).length;
      me = { rank: ahead + 1, score, accuracy: Number(best.Accuracy), timeMs, percentile: percentile(score), virtual: true };
    }
  }

  return {
    contestKey, participants, me,
    top: live.slice(0, 10).map((r) => ({ rank: r.rank, name: maskName(r.name), score: r.score, accuracy: r.accuracy, timeMs: r.timeMs, isMe: r.userId === userId })),
  };
}
