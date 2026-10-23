import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import {
  getWrittenSolutionById,
  submitWrittenSolution,
} from "@/lib/written-solutions-db";
import { saveSolutionImage } from "@/lib/solutions-storage";

export async function POST(request, context) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
    }
    if (session.role !== "mentor" && session.role !== "admin") {
      return NextResponse.json({ error: "Mentor account required." }, { status: 403 });
    }

    const { id } = await context.params;
    const mentorId = Number(session.sub);

    const existing = await getWrittenSolutionById(id);
    if (!existing) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    if (existing.MentorId && existing.MentorId !== mentorId && session.role !== "admin") {
      return NextResponse.json(
        { error: "This request is assigned to another mentor." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("photo");
    const notes = formData.get("notes")?.toString() || null;

    if (!file || typeof file !== "object" || file.size === 0) {
      return NextResponse.json(
        { error: "Please attach a photo of your handwritten solution." },
        { status: 400 }
      );
    }

    // Save image to secure solutions directory
    const saved = await saveSolutionImage(file, existing.RequestId || id);

    // Update database record with 30-day expiration
    const updated = await submitWrittenSolution({
      requestId: id,
      mentorId,
      fileName: saved.fileName,
      originalName: saved.originalName,
      filePath: saved.filePath,
      mimeType: saved.mimeType,
      fileSize: saved.fileSize,
      mentorNotes: notes,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update solution status in database." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Solution successfully sent to the student! It will be accessible for 30 days.",
      request: updated,
    });
  } catch (error) {
    console.error("Failed to submit solution:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit solution." },
      { status: 500 }
    );
  }
}

