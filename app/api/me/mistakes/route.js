import { userRoute } from "@/lib/api-user";
import { addMistakes, removeMistake, updateMistake } from "@/lib/user-data";

// POST   { items: [...] }                       add to the mistake book
// PATCH  { text, reason?, revisited? }          update one entry
// DELETE ?text=<question text>                  remove one entry
export const POST = userRoute(({ userId, body }) => addMistakes(userId, body.items));
export const PATCH = userRoute(({ userId, body }) => updateMistake(userId, body));
export const DELETE = userRoute(({ userId, query }) => removeMistake(userId, query.get("text")));
