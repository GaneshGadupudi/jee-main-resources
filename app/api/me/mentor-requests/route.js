import { userRoute } from "@/lib/api-user";
import { createMentorRequest } from "@/lib/user-data";

// POST { context? }
export const POST = userRoute(({ userId, body }) => createMentorRequest(userId, body.context));
