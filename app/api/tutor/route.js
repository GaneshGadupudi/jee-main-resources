import { GoogleGenAI } from "@google/genai";
import { HttpError, userRoute } from "@/lib/api-user";

// AI Tutor: answers a student's question with the Google Gemini API (free tier).
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const SYSTEM_INSTRUCTION = "You are a patient, encouraging AI Tutor for students. Explain concepts step-by-step using clear examples, structured formatting, and simple language.";
const FORMAT_RULES = [
  "Formatting rules: use short paragraphs, numbered steps, bullet lists with '-', and **bold** for key terms. Do not use tables or LaTeX; write maths in plain text, e.g. v = u + at, x^2, sqrt(2), 3/4.",
  "Keep answers focused and reasonably brief. Finish with one short question or next step that keeps the student learning.",
].join("\n");

const MAX_QUESTION = 2000;
const MAX_HISTORY = 12; // most recent turns sent to the model
const MAX_TURN = 4000;
const RATE_LIMIT = 20; // questions per student per minute, to protect the free quota
const RATE_WINDOW_MS = 60000;

const recent = new Map(); // userId -> timestamps of recent requests (per server process)
function checkRate(userId) {
  const now = Date.now();
  const hits = (recent.get(userId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) throw new HttpError(429, "You are asking questions very quickly. Please wait a minute and try again.");
  hits.push(now);
  recent.set(userId, hits);
}

const clean = (value, max) => String(value ?? "").trim().slice(0, max);

function describeContext(context) {
  if (!context) return "";
  if (typeof context === "string") {
    return `The student is currently working on this practice question/doubt:\n${clean(context, 1000)}`;
  }
  if (typeof context !== "object") return "";
  const questionText = clean(context.text, 1000);
  if (!questionText) return "";

  const options = Array.isArray(context.options) ? context.options.slice(0, 6).map((option, index) => `${String.fromCharCode(65 + index)}. ${clean(option, 300)}`).join("\n") : "";
  const lines = [
    "The student is currently working on this practice question:",
    `Subject: ${clean(context.subject, 60)} | Chapter: ${clean(context.chapter, 100)}`,
    `Question: ${questionText}`,
    options && `Options:\n${options}`,
  ];
  const answerIndex = Number(context.answer);
  if (Number.isInteger(answerIndex) && answerIndex >= 0 && answerIndex < 6) {
    lines.push(`The student has already answered. The correct option is ${String.fromCharCode(65 + answerIndex)}; you may explain why.`);
  } else {
    lines.push("The student has NOT answered yet. Give hints and explain the underlying concept, but never state or reveal the final answer or which option is correct.");
  }
  return lines.filter(Boolean).join("\n");
}

function toGeminiError(error) {
  const status = Number(error?.status || error?.code);
  const message = String(error?.message || "");
  if (status === 404) return new HttpError(502, `The AI Tutor's model (${MODEL}) is not available.`);
  if (status === 429 || /quota|rate/i.test(message)) return new HttpError(429, "The AI Tutor is very busy right now (free usage limit reached). Please try again in a minute.");
  if (status === 400 && /api key/i.test(message)) return new HttpError(502, "The AI Tutor's API key was rejected. Check GEMINI_API_KEY.");
  if (status === 401 || status === 403) return new HttpError(502, "The AI Tutor's API key is not authorized.");
  if (status === 503 || status === 500) return new HttpError(503, `Gemini is temporarily unavailable (HTTP ${status}). Please try again shortly.`);
  return new HttpError(502, error?.message || `The AI Tutor could not answer right now (HTTP ${status || "unknown"}). Please try again.`);
}

export const POST = userRoute(async ({ userId, body }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_google_ai_studio_key_here") {
    throw new HttpError(503, "The AI Tutor is not set up yet: GEMINI_API_KEY is missing on the server.");
  }

  const question = clean(body.question, MAX_QUESTION);
  if (!question) throw new HttpError(400, "Type a question for the tutor first.");
  checkRate(userId);

  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((turn) => turn && (turn.role === "user" || turn.role === "model") && typeof turn.text === "string" && turn.text.trim())
    .slice(-MAX_HISTORY)
    .map((turn) => ({ role: turn.role, parts: [{ text: clean(turn.text, MAX_TURN) }] }));
  // Gemini needs the conversation to start with a user turn.
  while (history.length && history[0].role !== "user") history.shift();

  const systemInstruction = [SYSTEM_INSTRUCTION, FORMAT_RULES, describeContext(body.context)].filter(Boolean).join("\n\n");

  try {
    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model: MODEL,
      contents: [...history, { role: "user", parts: [{ text: question }] }],
      config: { systemInstruction, temperature: 0.6 },
    });
    const reply = response.text?.trim();
    if (!reply) throw new HttpError(502, "The AI Tutor did not return an answer. Try rephrasing your question.");
    return { reply };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error("AI Tutor request failed:", {
      status: error?.status,
      code: error?.code,
      message: error?.message,
      model: MODEL,
    });
    throw toGeminiError(error);
  }
});
