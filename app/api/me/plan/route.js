import { userRoute } from "@/lib/api-user";
import { savePlan, setTask } from "@/lib/user-data";

// PUT   { date, signature, tasks }                                 save today's plan
// PATCH { date, taskKey, completed, score?, chapterKey? }          tick / untick a task
export const PUT = userRoute(({ userId, body }) => savePlan(userId, body));
export const PATCH = userRoute(({ userId, body }) => setTask(userId, body));
