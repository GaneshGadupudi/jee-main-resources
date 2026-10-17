// Older versions kept student data in the browser. On the first load after the upgrade we send it to the server once,
// then clear it so the database is the only copy. (The theme copy in "jee-theme" is kept on purpose: it avoids a flash on page load.)
const KEYS = ["jee-completed", "jee-mistakes", "jee-challenge", "jee-chapters-done", "jee-scores", "jee-answers", "jee-done", "jee-time", "jee-plan",
  "jee-contest-history", "jee-mock-history", "jee-contest-active", "jee-mock-active", "jee-notif-read"];

const read = (key) => { try { const raw = localStorage.getItem(key); return raw === null ? undefined : JSON.parse(raw); } catch { return undefined; } };
const list = (value) => (Array.isArray(value) ? value : []);

function withDay(entries) {
  return list(entries).filter((entry) => entry && Number.isFinite(entry.at)).map((entry) => ({ ...entry, d: new Date(entry.at).toLocaleDateString("en-CA") }));
}

// The read-notification record has had several shapes over time (array of ids, array of {id, readAt}, or an id -> value map).
function notificationReads(stored) {
  if (Array.isArray(stored)) return stored.map((e) => (typeof e === "string" ? { id: e, readAt: Date.now() } : e && typeof e.id === "string" ? { id: e.id, readAt: Number(e.readAt) || Date.now() } : null)).filter(Boolean);
  if (stored && typeof stored === "object") return Object.entries(stored).map(([id, value]) => ({ id, readAt: Number(typeof value === "object" ? value?.readAt : value) || Date.now() }));
  return [];
}

export async function importLegacyStorage(contestKey) {
  try {
    if (!KEYS.some((key) => localStorage.getItem(key) !== null)) return;
    const payload = {
      mistakes: list(read("jee-mistakes")), answers: list(read("jee-answers")), chaptersDone: list(read("jee-chapters-done")), done: list(read("jee-done")),
      scores: read("jee-scores") || {}, contestHistory: withDay(read("jee-contest-history")), mockHistory: withDay(read("jee-mock-history")),
      contestKey, registered: read("jee-challenge") === true, notificationReads: notificationReads(read("jee-notif-read")),
    };
    const response = await fetch("/api/me/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (response.ok) KEYS.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error("Could not move saved browser data to your account:", error);
  }
}
