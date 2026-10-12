import { getContests } from "./contest";
import { dayKey } from "./progress";

const fmtDate = (date) => date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
const fmtTime = (date) => date.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });

export function relative(ms) {
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  return `in ${Math.round(hours / 24)} days`;
}

// Builds the notification list from what the student actually has going on. Ids change when the situation changes,
// so a notification that was read comes back only when there is something new to say.
export function buildNotifications({ now, registered, planTasks, completed, mistakes, streak, todayCount, examDays, contestHistory, mockHistory }) {
  const today = dayKey(new Date(now));
  const items = [];
  const { upcoming } = getContests(new Date(now));
  const live = now >= upcoming.start.getTime() && now <= upcoming.end.getTime();
  const attempted = contestHistory.some((entry) => entry.contestId === upcoming.id);

  if (live && !attempted) {
    items.push({ id: `contest-live-${upcoming.id}`, tone: "green", icon: "trophy", view: "challenge", title: `${upcoming.title} is live`, body: registered ? `Ends at ${fmtTime(upcoming.end)}. Enter the contest now.` : `Register and join before it ends at ${fmtTime(upcoming.end)}.`, when: "Live now" });
  } else if (!live) {
    items.push({ id: `contest-${upcoming.id}-${registered ? "registered" : "open"}`, tone: registered ? "green" : "violet", icon: "trophy", view: "challenge", title: registered ? "You are registered for the weekly challenge" : "Weekly challenge registration is open", body: `${upcoming.title}: ${fmtDate(upcoming.start)}, ${fmtTime(upcoming.start)}. ${upcoming.questions.length} questions in ${upcoming.minutes} minutes.`, when: `Starts ${relative(upcoming.start.getTime() - now)}` });
  }

  items.push({ id: "live-sessions-planning", tone: "blue", icon: "video", view: "live-sessions", title: "Live sessions are coming", body: "Online Q&A with students from IITs, NITs and IIITs is being planned. Dates will appear here once confirmed.", when: "In planning" });

  if (planTasks.length) {
    const remaining = planTasks.filter((task) => !completed.includes(task.id));
    items.push(remaining.length
      ? { id: `plan-${today}`, tone: "violet", icon: "plan", view: "study-plan", title: `${remaining.length} task${remaining.length === 1 ? "" : "s"} left in today's plan`, body: `Next up: ${remaining[0].title}.`, when: "Today" }
      : { id: `plan-done-${today}`, tone: "green", icon: "plan", view: "study-plan", title: "Today's plan is complete", body: "Nice work. Try a mock test or clear your mistake book next.", when: "Today" });
  }

  if (streak > 0 && todayCount === 0 && !completed.length) {
    items.push({ id: `streak-${today}`, tone: "amber", icon: "flame", view: "study-plan", title: `Keep your ${streak}-day streak alive`, body: "Do one study task or answer a question today.", when: "Today" });
  }

  const pending = mistakes.filter((item) => !item.revisited).length;
  if (pending) items.push({ id: `mistakes-${today}`, tone: "red", icon: "book", view: "mistakes", title: `${pending} question${pending === 1 ? "" : "s"} waiting in your mistake book`, body: "Revisit them while the explanations are fresh.", when: "Revision" });

  if (!mockHistory.length) {
    items.push({ id: "mock-first", tone: "violet", icon: "clipboard", view: "mock-tests", title: "Take your first mock test", body: "A timed paper shows where you stand and which chapters to revise.", when: "Suggested" });
  } else if (now - mockHistory[0].at > 7 * 86400000) {
    items.push({ id: `mock-due-${mockHistory[0].at}`, tone: "violet", icon: "clipboard", view: "mock-tests", title: "Time for another mock test", body: "Your last mock was over a week ago.", when: "Suggested" });
  }

  if (examDays > 0 && examDays <= 30) {
    items.push({ id: `exam-${examDays}`, tone: "amber", icon: "clock", view: "study-plan", title: `${examDays} day${examDays === 1 ? "" : "s"} to your exam`, body: "Focus on high-weightage chapters and take a mock test every 3 days.", when: "Countdown" });
  }
  return items;
}
