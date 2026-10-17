import { userRoute } from "@/lib/api-user";
import { importLegacy } from "@/lib/user-data";

// One-time move of data that older versions kept in the browser. Safe to repeat: anything already saved is skipped.
export const POST = userRoute(({ userId, body }) => importLegacy(userId, body));
