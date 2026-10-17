import { userRoute } from "@/lib/api-user";
import { setTheme } from "@/lib/user-data";

// PUT { theme: "light" | "dark" }
export const PUT = userRoute(({ userId, body }) => setTheme(userId, body.theme));
