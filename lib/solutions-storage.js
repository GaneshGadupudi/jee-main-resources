import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const SOLUTIONS_DIR = path.join(process.cwd(), "storage", "solutions");
const QUESTIONS_DIR = path.join(process.cwd(), "storage", "questions");

export const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"];

export async function ensureSolutionsDir() {
  await fs.mkdir(SOLUTIONS_DIR, { recursive: true });
  await fs.mkdir(QUESTIONS_DIR, { recursive: true });
}

export async function saveSolutionImage(file, requestId) {
  await ensureSolutionsDir();

  const originalName = file.name || "solution.jpg";
  const ext = path.extname(originalName).toLowerCase() || ".jpg";

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error("Invalid image format. Please upload a JPG, PNG, or WEBP photo of the solution.");
  }

  const mimeType = file.type || "image/jpeg";
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType) && !ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error("Invalid image file type. Please upload a valid image file.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Solution photo exceeds the 15MB size limit. Please upload a smaller image.");
  }

  const safeReqId = String(requestId).replace(/[^a-zA-Z0-9_-]/g, "");
  const randomSuffix = crypto.randomBytes(6).toString("hex");
  const fileName = `sol_${safeReqId}_${randomSuffix}${ext}`;
  const filePath = path.join(SOLUTIONS_DIR, fileName);

  await fs.writeFile(filePath, buffer);

  return {
    fileName,
    filePath,
    fileSize: buffer.length,
    mimeType,
    originalName,
  };
}

export async function saveQuestionImage(file, requestId) {
  await ensureSolutionsDir();

  const originalName = file.name || "question.jpg";
  const ext = path.extname(originalName).toLowerCase() || ".jpg";

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error("Invalid image format for question. Please upload a JPG, PNG, or WEBP photo.");
  }

  const mimeType = file.type || "image/jpeg";
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Question photo exceeds the 15MB size limit.");
  }

  const safeReqId = String(requestId).replace(/[^a-zA-Z0-9_-]/g, "");
  const randomSuffix = crypto.randomBytes(6).toString("hex");
  const fileName = `q_${safeReqId}_${randomSuffix}${ext}`;
  const filePath = path.join(QUESTIONS_DIR, fileName);

  await fs.writeFile(filePath, buffer);

  return {
    fileName,
    filePath,
    fileSize: buffer.length,
    mimeType,
    originalName,
  };
}

export async function getSolutionImageBuffer(fileName) {
  const sanitized = path.basename(fileName);
  const fullPath = path.join(SOLUTIONS_DIR, sanitized);

  try {
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) return null;
    const buffer = await fs.readFile(fullPath);
    return { buffer, fullPath, stat };
  } catch {
    return null;
  }
}

export async function getQuestionImageBuffer(fileName) {
  const sanitized = path.basename(fileName);
  const fullPath = path.join(QUESTIONS_DIR, sanitized);

  try {
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) return null;
    const buffer = await fs.readFile(fullPath);
    return { buffer, fullPath, stat };
  } catch {
    return null;
  }
}

export async function deleteSolutionImage(fileName) {
  if (!fileName) return;
  const sanitized = path.basename(fileName);
  const fullPath = path.join(SOLUTIONS_DIR, sanitized);

  try {
    await fs.unlink(fullPath);
  } catch {
    // Ignore error if file doesn't exist
  }
}

export async function deleteQuestionImage(fileName) {
  if (!fileName) return;
  const sanitized = path.basename(fileName);
  const fullPath = path.join(QUESTIONS_DIR, sanitized);

  try {
    await fs.unlink(fullPath);
  } catch {
    // Ignore error if file doesn't exist
  }
}

