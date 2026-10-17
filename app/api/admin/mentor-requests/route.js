import { adminRoute } from "@/lib/admin";
import { listMentorRequests } from "@/lib/admin-data";

// GET ?status=Open|Assigned|Closed (omit for all)
export const GET = adminRoute(({ query }) => listMentorRequests(query.get("status")));
