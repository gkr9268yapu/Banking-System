import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { DUMMY_HASH, verifyPassword } from "@/lib/auth";
import { getPool } from "@/lib/db";
import {
  homeFor,
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  type Role,
} from "@/lib/jwt";
import { clearFailures, getLockSeconds, recordFailure } from "@/lib/rateLimit";
import { parseLoginInput } from "@/lib/validators";

interface LoginRow extends RowDataPacket {
  user_id: number;
  password_hash: string;
  role: Role;
  status: "ACTIVE" | "BLOCKED" | "DEACTIVATED" | "DELETED";
}

// Same message for a wrong email and a wrong password,
// so nobody can find out which emails exist.
const WRONG_LOGIN = "Incorrect email or password.";

function getClientIp(request: Request): string {
  // Vercel puts the real visitor address in x-forwarded-for.
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

export async function POST(request: Request) {
  // 1. Read and validate the input
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const input = parseLoginInput(body);
  if (!input.ok) {
    return NextResponse.json({ error: input.error }, { status: 400 });
  }
  const { email, password } = input.value;

  // 2. Too many recent failures from this address for this email?
  const limitKey = `${getClientIp(request)}|${email}`;
  const waitSeconds = getLockSeconds(limitKey);
  if (waitSeconds > 0) {
    return NextResponse.json(
      {
        error: `Too many failed attempts. Try again in ${Math.ceil(waitSeconds / 60)} minute(s).`,
      },
      { status: 429, headers: { "Retry-After": String(waitSeconds) } },
    );
  }

  try {
    // 3. Find the user (parameterized query)
    const [rows] = await getPool().execute<LoginRow[]>(
      "SELECT user_id, password_hash, role, status FROM users WHERE email = ?",
      [email],
    );
    const user = rows[0];

    // 4. Always run bcrypt, even for an unknown email, so timing looks the same
    const passwordOk = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);

    if (!user || !passwordOk || user.status === "DELETED") {
      recordFailure(limitKey);
      return NextResponse.json({ error: WRONG_LOGIN }, { status: 401 });
    }

    // 5. Right password, but only ACTIVE users may log in
    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "This account is blocked or deactivated. Please contact the bank." },
        { status: 403 },
      );
    }

    // 6. Success: set the signed cookie and tell the browser where to go
    clearFailures(limitKey);
    const token = await signSession(user.user_id, user.role);
    const response = NextResponse.json({ ok: true, redirectTo: homeFor(user.role) });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    // Log the error only (never the request body, it contains the password).
    console.error("Login error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
