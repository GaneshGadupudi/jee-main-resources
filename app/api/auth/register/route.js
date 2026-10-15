import { NextResponse } from "next/server";
import { createSession, registerUser } from "@/lib/auth-server";

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();
    if (!name?.trim() || !email?.trim() || typeof password !== "string" || password.length < 6) return NextResponse.json({ error: "Enter your name, email and a password of at least 6 characters." }, { status: 400 });
    const user = await registerUser({ name, email, password });
    await createSession({ id: user.Id, name: user.Name, email: user.Email });
    return NextResponse.json({ user: { id: user.Id, name: user.Name, email: user.Email } }, { status: 201 });
  } catch (error) {
    if (error?.number === 2627 || error?.number === 2601 || error?.message?.includes("already exists")) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    console.error("Registration failed:", error);
    return NextResponse.json({ error: "Unable to create your account." }, { status: 500 });
  }
}
