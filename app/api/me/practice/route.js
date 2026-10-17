import { userRoute } from "@/lib/api-user";
import { addAnswers } from "@/lib/user-data";

// POST { answers: [{ d, src, s, c, q, ok }] }
export const POST = userRoute(({ userId, body }) => addAnswers(userId, body.answers));
