import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const RESUMES_DIR = path.join(process.cwd(), "storage", "resumes");
export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function ensureStorageDir() {
  await fs.mkdir(RESUMES_DIR, { recursive: true });
}

export async function saveResumeFile(file, applicationId) {
  await ensureStorageDir();

  const originalName = file.name || "resume.pdf";
  const ext = path.extname(originalName).toLowerCase() || ".pdf";
  const allowedExts = [".pdf", ".doc", ".docx"];

  if (!allowedExts.includes(ext)) {
    throw new Error("Invalid file extension. Please upload a PDF or Word document.");
  }

  const mimeType = file.type || "application/pdf";
  if (!ALLOWED_RESUME_MIME_TYPES.includes(mimeType) && !ext.includes("pdf")) {
    throw new Error("Invalid file type. Only PDF and Word documents are permitted.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length > MAX_RESUME_SIZE_BYTES) {
    throw new Error("Resume exceeds the 5MB size limit. Please upload a smaller file.");
  }

  // Generate safe, collision-resistant unique file name
  const safeAppId = applicationId.replace(/[^a-zA-Z0-9_-]/g, "");
  const randomSuffix = crypto.randomBytes(6).toString("hex");
  const fileName = `resume_${safeAppId}_${randomSuffix}${ext}`;
  const filePath = path.join(RESUMES_DIR, fileName);

  await fs.writeFile(filePath, buffer);

  return {
    fileName,
    filePath,
    fileSize: buffer.length,
    mimeType,
    originalName,
  };
}

export async function getResumeFileBuffer(fileName) {
  // Prevent path traversal
  const sanitized = path.basename(fileName);
  const fullPath = path.join(RESUMES_DIR, sanitized);

  try {
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) return null;
    const buffer = await fs.readFile(fullPath);
    return { buffer, fullPath, stat };
  } catch {
    return null;
  }
}

