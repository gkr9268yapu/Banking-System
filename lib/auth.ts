import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";
import { homeFor, SESSION_COOKIE, verifySession, type Role } from "@/lib/jwt";

// Server-side login checks. The cookie only says WHO the user is.
// Everything else (role, status, account) is read fresh from the database,
// so blocking a user or changing a role works immediately.

export type CurrentUser = {
  userId: number;
  fullName: string;
  email: string;
  role: Role;
  // Customers have an account, the admin may not. Always taken from the
  // session user, never from anything the browser sends.
  accountId: number | null;
  accountNumber: string | null;
};

interface UserRow extends RowDataPacket {
  user_id: number;
  full_name: string;
  email: string;
  role: Role;
  account_id: number | null;
  account_number: string | null;
}

// Returns the signed-in user, or null if there is no cookie, the token is
// invalid, or the user is not ACTIVE any more (blocked, deactivated, deleted).
// cache() makes a page and its components share one database query per request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies();
  const session = await verifySession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const [rows] = await getPool().execute<UserRow[]>(
    `SELECT u.user_id, u.full_name, u.email, u.role,
            a.account_id, a.account_number
       FROM users u
       LEFT JOIN accounts a ON a.user_id = u.user_id
      WHERE u.user_id = ? AND u.status = 'ACTIVE'`,
    [session.userId],
  );
  const row = rows[0];
  if (!row) return null;

  return {
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    accountId: row.account_id,
    accountNumber: row.account_number,
  };
});

// For pages (server components): call this at the top of EVERY protected page.
// No valid session sends the user to the login page. The wrong role sends
// them to their own home page.
export async function requireUser(role?: Role): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?session=ended");
  if (role && user.role !== role) redirect(homeFor(user.role));
  return user;
}

// For API routes. Use it like this:
//   const auth = await authorizeApi("CUSTOMER");
//   if (!auth.ok) return auth.response;
//   const user = auth.user;
export async function authorizeApi(
  role?: Role,
): Promise<{ ok: true; user: CurrentUser } | { ok: false; response: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Please sign in again." },
        { status: 401 },
      ),
    };
  }
  if (role && user.role !== role) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "You are not allowed to do this." },
        { status: 403 },
      ),
    };
  }
  return { ok: true, user };
}

// bcrypt compare that never throws: a broken hash simply means "wrong password".
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

// Hash of a random string nobody knows. When the email does not exist we still
// run bcrypt against this, so a wrong email takes as long as a wrong password.
export const DUMMY_HASH =
  "$2b$10$zOAkoPv1JqyzgiegxP.1JO3ImAy41FZpLEzDKmAp0sYKKiKd9LWp6";
