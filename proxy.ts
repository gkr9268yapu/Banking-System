import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { homeFor, SESSION_COOKIE, verifySession } from "@/lib/jwt";

// First line of defence: runs before every page and API request.
// It only reads the cookie (no database) to send people to the right place.
// The real checks are in lib/auth.ts and run again inside every page and API route.

// Anyone may open these without signing in.
const PUBLIC_PATHS = ["/", "/login", "/api/auth/login", "/api/auth/logout"];

// Only the admin may open these.
const ADMIN_ONLY = ["/admin", "/api/admin"];

// Only customers may open these.
const CUSTOMER_ONLY = [
  "/dashboard",
  "/transfer",
  "/transactions",
  "/account",
  "/qr",
  "/api/transfer",
  "/api/transactions",
  "/api/qr",
];

// "/account" matches "/account" and "/account/x" but not "/accountant".
function matches(pathname: string, paths: string[]): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (matches(pathname, PUBLIC_PATHS)) return NextResponse.next();

  const isApi = pathname.startsWith("/api/");
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  // Not signed in
  if (!session) {
    if (isApi) {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Signed in, but the wrong kind of user for this area
  const wrongArea =
    (session.role !== "ADMIN" && matches(pathname, ADMIN_ONLY)) ||
    (session.role !== "CUSTOMER" && matches(pathname, CUSTOMER_ONLY));
  if (wrongArea) {
    if (isApi) {
      return NextResponse.json({ error: "You are not allowed to do this." }, { status: 403 });
    }
    return NextResponse.redirect(new URL(homeFor(session.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next.js internals and files with an extension (icons, images, manifest).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};