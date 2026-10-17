import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getTaxonomy } from "@/lib/pyq-db";

export async function GET() {
  try {
    if (!(await getSession())) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
    return NextResponse.json({ subjects: await getTaxonomy() });
  } catch (error) {
    console.error("PYQ taxonomy failed:", error);
    return NextResponse.json({ error: "Unable to load PYQ filters." }, { status: 500 });
  }
}
