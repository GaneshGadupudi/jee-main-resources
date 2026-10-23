import { NextResponse } from "next/server";
import { HttpError } from "@/lib/api-user";
import { checkResetToken, resetPassword } from "@/lib/password-reset";

// GET ?token=...  -> { valid, role, name, email }
export async function GET(request) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    const result = await checkResetToken(token);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Reset link check failed:", error);
    return NextResponse.json({ error: "Unable to check the link." }, { status: 500 });
  }
}

// POST { token, password }
export async function POST(request) {
  try {
    const { token, password } = await request.json().catch(() => ({}));
    const result = await resetPassword(token, password);
    return NextResponse.json({ ok: true, role: result?.role, email: result?.email });
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Password reset failed:", error);
    return NextResponse.json({ error: "Unable to reset your password. Please try again." }, { status: 500 });
  }
}
