import { NextResponse } from "next/server";
import { HttpError } from "@/lib/api-user";
import { isResetTokenValid, resetPassword } from "@/lib/password-reset";

// GET ?token=...  -> { valid }   (lets the page say "expired" before the student types a password)
export async function GET(request) {
  try {
    return NextResponse.json({ valid: await isResetTokenValid(new URL(request.url).searchParams.get("token")) });
  } catch (error) {
    console.error("Reset link check failed:", error);
    return NextResponse.json({ error: "Unable to check the link." }, { status: 500 });
  }
}

// POST { token, password }
export async function POST(request) {
  try {
    const { token, password } = await request.json().catch(() => ({}));
    await resetPassword(token, password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Password reset failed:", error);
    return NextResponse.json({ error: "Unable to reset your password. Please try again." }, { status: 500 });
  }
}
