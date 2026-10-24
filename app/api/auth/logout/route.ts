import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/jwt";

// POST only: a plain link (GET) must not be able to log someone out.
export async function POST() {
  const response = NextResponse.json({ ok: true });
  // Same cookie settings, but empty and already expired: the browser deletes it.
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
