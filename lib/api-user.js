import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Wraps a route handler for logged-in students: checks the session, parses the JSON body, and turns errors into JSON responses.
// handler({ userId, body, query }) returns the JSON to send back (defaults to { ok: true }).
export function userRoute(handler) {
  return async (request) => {
    try {
      const session = await getSession();
      if (!session) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
      const hasBody = ["POST", "PUT", "PATCH"].includes(request.method);
      const body = hasBody ? await request.json().catch(() => ({})) : {};
      const result = await handler({ userId: Number(session.sub), body, query: new URL(request.url).searchParams });
      return NextResponse.json(result ?? { ok: true });
    } catch (error) {
      if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
      console.error(`${request.method} ${request.url} failed:`, error);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}
