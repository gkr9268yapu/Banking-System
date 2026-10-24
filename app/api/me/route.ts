import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth";

// Who am I? Any signed-in ACTIVE user (customer or admin) may call this.
// Only safe fields are returned, never the password hash.
export async function GET() {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const { fullName, email, role, accountNumber } = auth.user;
  return NextResponse.json({ fullName, email, role, accountNumber });
}
