import crypto from "node:crypto";
import { getDb, sql } from "@/lib/db";
import { HttpError } from "@/lib/api-user";
import { sendMail } from "@/lib/mailer";

// Study circle: small private groups with a weekly leaderboard.
//   Weekly score = questions answered correctly since Monday; ties go to the better accuracy, then more study minutes.

const MAX_GROUPS_PER_USER = 5;
const MAX_MEMBERS = 30;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I, easy to read out loud

const MAX_WEEKS_BACK = 12;

// Monday and Sunday (YYYY-MM-DD) of the week `offset` weeks from now: 0 = this week, -1 = last week, and so on.
const weekRange = (offset) => {
  const start = new Date();
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + offset * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: start.toLocaleDateString("en-CA"), end: end.toLocaleDateString("en-CA") };
};
const newCode = () => Array.from(crypto.randomBytes(6), (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");

// Pending invitations for the student; `at` (ms since epoch) makes each notification id unique if they are invited to the same group again.
export async function getInvites(userId) {
  const pool = await getDb();
  const rows = (await pool.request().input("u", sql.Int, userId).query(`
    SELECT g.Id, g.Name, i.InvitedByName, DATEDIFF_BIG(MILLISECOND, '1970-01-01', i.CreatedAt) AS at
    FROM dbo.StudyGroupInvites i JOIN dbo.StudyGroups g ON g.Id = i.GroupId
    WHERE i.InvitedUserId = @u ORDER BY i.CreatedAt DESC`)).recordset;
  return rows.map((r) => ({ groupId: Number(r.Id), groupName: r.Name, invitedBy: r.InvitedByName, at: Number(r.at) }));
}

export async function getCircle(userId, rawOffset = 0) {
  const offset = Math.min(0, Math.max(-MAX_WEEKS_BACK, Math.trunc(Number(rawOffset)) || 0));
  const week = weekRange(offset);
  const pool = await getDb();
  const rows = (await pool.request().input("u", sql.Int, userId).input("monday", sql.VarChar(10), week.start).input("sunday", sql.VarChar(10), week.end).query(`
    SELECT g.Id AS GroupId, g.Name AS GroupName, g.InviteCode, m.UserId, u.Name,
           ISNULL(p.Correct, 0) AS Correct, ISNULL(p.Total, 0) AS Total, ISNULL(s.Mins, 0) AS Mins
    FROM dbo.StudyGroupMembers me
    JOIN dbo.StudyGroups g ON g.Id = me.GroupId
    JOIN dbo.StudyGroupMembers m ON m.GroupId = g.Id
    JOIN dbo.Users u ON u.Id = m.UserId
    OUTER APPLY (SELECT SUM(CAST(IsCorrect AS INT)) AS Correct, COUNT(*) AS Total FROM dbo.PracticeAnswers a WHERE a.UserId = m.UserId AND a.AnsweredOn >= CAST(@monday AS DATE) AND a.AnsweredOn <= CAST(@sunday AS DATE)) p
    OUTER APPLY (SELECT SUM(CAST(t.Minutes AS INT)) AS Mins FROM dbo.StudyPlanTasks t JOIN dbo.StudyPlans sp ON sp.Id = t.PlanId
                 WHERE sp.UserId = m.UserId AND t.IsCompleted = 1 AND t.CompletedAt >= CAST(@monday AS DATE) AND t.CompletedAt < DATEADD(DAY, 1, CAST(@sunday AS DATE))) s
    WHERE me.UserId = @u
    ORDER BY g.Id`)).recordset;

  const groups = new Map();
  for (const row of rows) {
    const group = groups.get(row.GroupId) || { id: Number(row.GroupId), name: row.GroupName, code: row.InviteCode, members: [] };
    const total = Number(row.Total);
    group.members.push({ userId: Number(row.UserId), name: row.Name, correct: Number(row.Correct), total, accuracy: total ? Math.round((Number(row.Correct) / total) * 100) : 0, minutes: Number(row.Mins) });
    groups.set(row.GroupId, group);
  }
  const invites = await getInvites(userId);
  return {
    week: { offset, start: week.start, end: week.end, canGoBack: offset > -MAX_WEEKS_BACK },
    invites,
    groups: [...groups.values()].map((group) => {
      group.members.sort((a, b) => b.correct - a.correct || b.accuracy - a.accuracy || b.minutes - a.minutes);
      let rank = 0;
      return { ...group, members: group.members.map((member, index, list) => {
        const prev = list[index - 1];
        if (!prev || prev.correct !== member.correct || prev.accuracy !== member.accuracy || prev.minutes !== member.minutes) rank = index + 1;
        return { rank, name: member.name, correct: member.correct, total: member.total, accuracy: member.accuracy, minutes: member.minutes, isMe: member.userId === userId };
      }) };
    }),
  };
}

async function joinedCount(pool, userId) {
  const { recordset } = await pool.request().input("u", sql.Int, userId).query("SELECT COUNT(*) AS n FROM dbo.StudyGroupMembers WHERE UserId = @u");
  return Number(recordset[0].n);
}

export async function createGroup(userId, rawName) {
  const name = String(rawName || "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 40) throw new HttpError(400, "Give your group a name of 2 to 40 characters.");
  const pool = await getDb();
  if ((await joinedCount(pool, userId)) >= MAX_GROUPS_PER_USER) throw new HttpError(400, `You can be in up to ${MAX_GROUPS_PER_USER} groups. Leave one first.`);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const { recordset } = await pool.request().input("n", sql.NVarChar(40), name).input("c", sql.VarChar(8), newCode())
        .query("INSERT INTO dbo.StudyGroups (Name, InviteCode) OUTPUT INSERTED.Id VALUES (@n, @c)");
      await pool.request().input("g", sql.Int, recordset[0].Id).input("u", sql.Int, userId).query("INSERT INTO dbo.StudyGroupMembers (GroupId, UserId) VALUES (@g, @u)");
      return getCircle(userId);
    } catch (error) {
      if (error.number !== 2627 && error.number !== 2601) throw error; // invite code collision: try another
    }
  }
  throw new HttpError(500, "Could not create the group. Please try again.");
}

export async function joinGroup(userId, rawCode) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(code)) throw new HttpError(400, "Enter a valid invite code.");
  const pool = await getDb();
  const group = (await pool.request().input("c", sql.VarChar(8), code).query(`
    SELECT g.Id, (SELECT COUNT(*) FROM dbo.StudyGroupMembers WHERE GroupId = g.Id) AS Members FROM dbo.StudyGroups g WHERE g.InviteCode = @c`)).recordset[0];
  if (!group) throw new HttpError(404, "No group found with that code.");
  const already = (await pool.request().input("g", sql.Int, group.Id).input("u", sql.Int, userId).query("SELECT 1 AS x FROM dbo.StudyGroupMembers WHERE GroupId = @g AND UserId = @u")).recordset.length;
  if (already) throw new HttpError(409, "You are already in this group.");
  if (Number(group.Members) >= MAX_MEMBERS) throw new HttpError(400, "This group is full.");
  if ((await joinedCount(pool, userId)) >= MAX_GROUPS_PER_USER) throw new HttpError(400, `You can be in up to ${MAX_GROUPS_PER_USER} groups. Leave one first.`);
  await pool.request().input("g", sql.Int, group.Id).input("u", sql.Int, userId).query("INSERT INTO dbo.StudyGroupMembers (GroupId, UserId) VALUES (@g, @u)");
  return getCircle(userId);
}

export async function leaveGroup(userId, groupId) {
  const pool = await getDb();
  await pool.request().input("g", sql.Int, groupId).input("u", sql.Int, userId).query(`
    DELETE FROM dbo.StudyGroupMembers WHERE GroupId = @g AND UserId = @u;
    DELETE FROM dbo.StudyGroups WHERE Id = @g AND NOT EXISTS (SELECT 1 FROM dbo.StudyGroupMembers WHERE GroupId = @g);`);
  return getCircle(userId);
}

// Invite a registered student by email. Tells the sender plainly when that email has no account, or the student is already in the group / already invited.
export async function inviteByEmail(userId, groupId, rawEmail) {
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) throw new HttpError(400, "Enter a valid email address.");
  const pool = await getDb();
  const group = (await pool.request().input("g", sql.Int, groupId).input("u", sql.Int, userId).query(`
    SELECT g.Name, me.Name AS MyName, me.Email AS MyEmail, (SELECT COUNT(*) FROM dbo.StudyGroupMembers WHERE GroupId = g.Id) AS Members
    FROM dbo.StudyGroups g JOIN dbo.StudyGroupMembers m ON m.GroupId = g.Id AND m.UserId = @u JOIN dbo.Users me ON me.Id = @u WHERE g.Id = @g`)).recordset[0];
  if (!group) throw new HttpError(404, "Group not found.");
  if (String(group.MyEmail).toLowerCase() === email) throw new HttpError(400, "That is your own email address.");
  if (Number(group.Members) >= MAX_MEMBERS) throw new HttpError(400, "This group is full.");

  const target = (await pool.request().input("e", sql.NVarChar(320), email).query("SELECT Id, Name FROM dbo.Users WHERE Email = @e")).recordset[0];
  if (!target) throw new HttpError(404, "User not available. No student is registered with " + email + ". Ask them to sign up first, or share the group's invite code.");

  const status = (await pool.request().input("g", sql.Int, groupId).input("t", sql.Int, target.Id).query(`
    SELECT CASE WHEN EXISTS (SELECT 1 FROM dbo.StudyGroupMembers WHERE GroupId = @g AND UserId = @t) THEN 'member'
                WHEN EXISTS (SELECT 1 FROM dbo.StudyGroupInvites WHERE GroupId = @g AND InvitedUserId = @t) THEN 'invited' ELSE 'new' END AS s`)).recordset[0].s;
  if (status === "member") throw new HttpError(409, target.Name + " is already in this group.");
  if (status === "invited") throw new HttpError(409, "You have already invited " + target.Name + ". They can accept from their Study circle.");

  await pool.request().input("g", sql.Int, groupId).input("t", sql.Int, target.Id).input("by", sql.NVarChar(200), group.MyName)
    .query("INSERT INTO dbo.StudyGroupInvites (GroupId, InvitedUserId, InvitedByName) VALUES (@g, @t, @by)");
  sendMail({
    to: email,
    subject: group.MyName + " invited you to a study group",
    text: group.MyName + " invited you to join \"" + group.Name + "\" on JEE Compass.\n\nOpen your dashboard and go to Study circle to accept: " + (process.env.APP_URL || "") + "/dashboard\n",
  }).catch((error) => console.error("Study group invite email failed:", error));
  return { ...(await getCircle(userId)), notice: "Invitation sent to " + target.Name + ". They will see it in their notifications and Study circle." };
}

export async function respondToInvite(userId, groupId, accept) {
  const pool = await getDb();
  if (accept) {
    const invite = (await pool.request().input("g", sql.Int, groupId).input("u", sql.Int, userId).query(`
      SELECT (SELECT COUNT(*) FROM dbo.StudyGroupMembers WHERE GroupId = @g) AS Members FROM dbo.StudyGroupInvites WHERE GroupId = @g AND InvitedUserId = @u`)).recordset[0];
    if (!invite) throw new HttpError(404, "That invitation is no longer available.");
    if (Number(invite.Members) >= MAX_MEMBERS) throw new HttpError(400, "This group is full.");
    if ((await joinedCount(pool, userId)) >= MAX_GROUPS_PER_USER) throw new HttpError(400, `You can be in up to ${MAX_GROUPS_PER_USER} groups. Leave one first.`);
    await pool.request().input("g", sql.Int, groupId).input("u", sql.Int, userId).query("INSERT INTO dbo.StudyGroupMembers (GroupId, UserId) VALUES (@g, @u)");
  }
  await pool.request().input("g", sql.Int, groupId).input("u", sql.Int, userId).query("DELETE FROM dbo.StudyGroupInvites WHERE GroupId = @g AND InvitedUserId = @u");
  return getCircle(userId);
}
