import { userRoute } from "@/lib/api-user";
import { markNotificationsRead } from "@/lib/user-data";

// PUT { reads: [{ id, readAt }] }
export const PUT = userRoute(({ userId, body }) => markNotificationsRead(userId, body.reads));
