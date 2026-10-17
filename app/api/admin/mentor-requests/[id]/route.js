import { adminRoute } from "@/lib/admin";
import { updateMentorRequest } from "@/lib/admin-data";

// PATCH { status, assignedTo?, adminNote? }
export const PATCH = adminRoute(({ body, params }) => updateMentorRequest(Number(params.id), body));
