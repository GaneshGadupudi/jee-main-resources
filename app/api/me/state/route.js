import { userRoute } from "@/lib/api-user";
import { getState } from "@/lib/user-data";

// Everything the dashboard needs about the student in one call. ?today=YYYY-MM-DD (the student's local day) &contest=<upcoming contest id>
export const GET = userRoute(({ userId, query }) => getState(userId, { today: query.get("today"), contestKey: query.get("contest") }));
