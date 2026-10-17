import { userRoute } from "@/lib/api-user";
import { discardSession, saveSession, submitAttempt } from "@/lib/user-data";

// PUT    { type, session }   autosave the running test
// DELETE ?type=              discard the running test
// POST   { type, entry }     submit a finished test
export const PUT = userRoute(({ userId, body }) => saveSession(userId, body.type, body.session));
export const DELETE = userRoute(({ userId, query }) => discardSession(userId, query.get("type")));
export const POST = userRoute(({ userId, body }) => submitAttempt(userId, body.type, body.entry));
