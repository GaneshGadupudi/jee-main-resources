import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { HttpError } from "@/lib/api-user";

// Verify admin session based on role = 'admin' or matching configured ADMIN_EMAIL
export async function getAdmin() {
  const session = await getSession();
  if (!session) return null;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const isAdmin =
    session.role === "admin" ||
    (adminEmail && session.email?.toLowerCase() === adminEmail);

  if (!isAdmin) return null;
  return {
    id: Number(session.sub),
    email: session.email,
    name: session.name,
    role: "admin",
  };
}

// Route wrapper enforcing admin authorization
export function adminRoute(handler) {
  return async (request, context) => {
    try {
      const admin = await getAdmin();
      if (!admin) {
        return NextResponse.json({ error: "Admin access required." }, { status: 403 });
      }
      const body = ["POST", "PUT", "PATCH"].includes(request.method)
        ? await request.json().catch(() => ({}))
        : {};
      const result = await handler({
        admin,
        body,
        query: new URL(request.url).searchParams,
        params: context?.params ? await context.params : {},
      });
      return NextResponse.json(result ?? { ok: true });
    } catch (error) {
      if (error instanceof HttpError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error(`${request.method} ${request.url} failed:`, error);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }
  };
}
