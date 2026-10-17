export const EXAMS = ["JEE Main", "JEE Advanced"];
export const TYPES = ["MCQ", "MULTI", "NUMERIC"];

// Returns a list of human-readable problems. An empty list means the question passes the automatic checks.
// Passing these checks does NOT mean it is correct - the admin must still compare it with the official paper.
export function validateQuestion(q) {
  const errors = [];
  const text = (q.text || "").trim();
  const options = Array.isArray(q.options) ? q.options : [];
  const correct = Array.isArray(q.correct) ? q.correct : [];

  if (!EXAMS.includes(q.exam)) errors.push(`Exam must be one of: ${EXAMS.join(", ")}.`);
  if (!Number.isInteger(q.year) || q.year < 2002 || q.year > new Date().getFullYear()) errors.push("Year is missing or out of range.");
  if (!TYPES.includes(q.type)) errors.push(`Type must be one of: ${TYPES.join(", ")}.`);
  if (text.length < 10) errors.push("Question text is empty or suspiciously short.");
  if (!q.topicId) errors.push("Subject / chapter / topic is not assigned.");
  if (!q.sourceFile || !q.sourcePage) errors.push("Source file and page are required so the question can be traced to the official paper.");

  if (q.type === "MCQ" || q.type === "MULTI") {
    if (options.length !== 4) errors.push(`Expected 4 options, found ${options.length}.`);
    if (options.some((o) => !String(o || "").trim())) errors.push("One or more options are empty.");
    if (new Set(options.map((o) => String(o).trim())).size !== options.length) errors.push("Two options have identical text.");
    if (correct.some((i) => !Number.isInteger(i) || i < 0 || i >= options.length)) errors.push("Correct answer points to an option that does not exist.");
    if (q.type === "MCQ" && correct.length !== 1) errors.push("A single-correct question must have exactly one correct option.");
    if (q.type === "MULTI" && correct.length < 1) errors.push("Select at least one correct option.");
    if (new Set(correct).size !== correct.length) errors.push("Correct options contain duplicates.");
  } else if (q.type === "NUMERIC") {
    if (options.length) errors.push("A numerical-type question must not have options.");
    if (q.numericAnswer === null || q.numericAnswer === undefined || q.numericAnswer === "" || !Number.isFinite(Number(q.numericAnswer))) errors.push("Numerical answer is missing or not a number.");
  }
  if (/\[(image|figure|diagram)[^\]]*\]/i.test(text) && !q.imageUrl) errors.push("Text refers to an image/figure but no image is attached.");
  if (!(q.explanation || "").trim()) errors.push("Explanation is missing.");
  return errors;
}
