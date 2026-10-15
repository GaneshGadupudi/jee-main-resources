import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";

export async function GET() {
  try {
    const session = await getSession();
    return NextResponse.json({ user: session ? { id: session.sub, name: session.name, email: session.email } : null });
  } catch (error) {
    console.error("Session lookup failed:", error);
    return NextResponse.json({ error: "Unable to check your session." }, { status: 500 });
  }
}
