import { NextResponse } from "next/server";
import { authenticateUser, createSession } from "@/lib/auth-server";

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email?.trim() || typeof password !== "string" || !password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
    const user = await authenticateUser(email, password);
    if (!user) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    await createSession(user);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json({ error: "Unable to log in. Please try again." }, { status: 500 });
  }
}
