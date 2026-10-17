import { userRoute } from "@/lib/api-user";
import { setRegistration } from "@/lib/user-data";

// PUT { contestKey, registered }
export const PUT = userRoute(({ userId, body }) => setRegistration(userId, body.contestKey, !!body.registered));
