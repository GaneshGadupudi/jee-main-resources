import { HttpError, userRoute } from "@/lib/api-user";
import { createGroup, getCircle, getInvites, inviteByEmail, joinGroup, leaveGroup, respondToInvite } from "@/lib/study-circle";

// GET ?invites=1 returns only the pending invitations (cheap enough to poll for the notification bell)
// GET ?week=0 (this week), -1 (last week) ... back 12 weeks
export const GET = userRoute(async ({ userId, query }) => (query.get("invites") ? { invites: await getInvites(userId) } : getCircle(userId, query.get("week"))));

// POST { action: "create", name } | { action: "join", code } | { action: "invite", groupId, email } | { action: "accept" | "decline", groupId }
export const POST = userRoute(({ userId, body }) => {
  if (body.action === "create") return createGroup(userId, body.name);
  if (body.action === "join") return joinGroup(userId, body.code);
  if (body.action === "invite") return inviteByEmail(userId, Number(body.groupId), body.email);
  if (body.action === "accept" || body.action === "decline") return respondToInvite(userId, Number(body.groupId), body.action === "accept");
  throw new HttpError(400, "Unknown action.");
});

// DELETE ?group=<id>  (leave a group)
export const DELETE = userRoute(({ userId, query }) => {
  const groupId = Number(query.get("group"));
  if (!Number.isInteger(groupId)) throw new HttpError(400, "Missing group.");
  return leaveGroup(userId, groupId);
});
