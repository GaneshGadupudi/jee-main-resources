import { NextResponse } from "next/server";
import { requestReset } from "@/lib/password-reset";

// POST { email } - always answers the same way, so it cannot be used to find out who has an account.
export async function POST(request) {
  try {
    const { email } = await request.json().catch(() => ({}));
    if (typeof email !== "string" || !email.includes("@") || email.length > 320) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    await requestReset(email, new URL(request.url).origin);
    return NextResponse.json({ ok: true, message: "If an account exists for that email, we have sent a link to reset the password. It expires in one hour." });
  } catch (error) {
    console.error("Forgot password failed:", error);
    return NextResponse.json({ error: "Unable to send the reset link. Please try again." }, { status: 500 });
  }
}
