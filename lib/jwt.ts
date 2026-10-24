import { SignJWT, jwtVerify } from "jose";

// Everything about the login cookie that does NOT need the database.
// proxy.ts uses this file too, so keep database code out of it.

export type Role = "ADMIN" | "CUSTOMER";

export const SESSION_COOKIE = "gkr_session";
const SESSION_HOURS = 8;

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET is missing or shorter than 32 characters. Set it in .env.local.",
    );
  }
  return new TextEncoder().encode(secret);
}

// Creates the signed token that goes into the cookie.
export async function signSession(userId: number, role: Role): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(getSecret());
}

// Checks signature and expiry. Returns null for anything wrong.
// The role inside the token is only used for quick redirects in proxy.ts.
// Real permission checks always re-read the user from the database (lib/auth.ts).
export async function verifySession(
  token: string | undefined,
): Promise<{ userId: number; role: Role } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    const userId = Number(payload.sub);
    const role = payload.role;
    if (!Number.isInteger(userId) || (role !== "ADMIN" && role !== "CUSTOMER")) {
      return null;
    }
    return { userId, role };
  } catch {
    return null;
  }
}

// Cookie settings: JavaScript in the browser cannot read it (httpOnly),
// it is not sent from other sites (lax) and, in production, only over HTTPS.
// "secure" is off in development so http://localhost works in every browser.
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  };
}

// First page each role sees after signing in.
export function homeFor(role: Role): string {
  return role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
}
