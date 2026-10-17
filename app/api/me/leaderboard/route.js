import { HttpError, userRoute } from "@/lib/api-user";
import { getLeaderboard } from "@/lib/leaderboard";

// GET ?contest=<contest id, e.g. weekly-2026-10-17>
export const GET = userRoute(({ userId, query }) => {
  const contest = query.get("contest");
  if (!contest) throw new HttpError(400, "Missing contest.");
  return getLeaderboard(userId, contest);
});
