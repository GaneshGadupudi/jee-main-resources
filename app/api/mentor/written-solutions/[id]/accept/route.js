import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { acceptWrittenSolutionRequest } from "@/lib/written-solutions-db";

export async function PATCH(request, context) {
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

    const updated = await acceptWrittenSolutionRequest(id, mentorId);

    if (!updated) {
      return NextResponse.json(
        { error: "Request not found or already assigned to another mentor." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Request accepted. You can now prepare and upload the handwritten solution.",
      request: updated,
    });
  } catch (error) {
    console.error("Failed to accept written solution request:", error);
    return NextResponse.json(
      { error: "Unable to accept request." },
      { status: 500 }
    );
  }
}

