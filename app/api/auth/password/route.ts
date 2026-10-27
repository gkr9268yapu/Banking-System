import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { authorizeApi, DUMMY_HASH, verifyPassword } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { parsePasswordChange } from "@/lib/passwordValidators";
import { clearFailures, getLockSeconds, recordFailure } from "@/lib/rateLimit";

interface HashRow extends RowDataPacket {
    password_hash: string;
}

// POST /api/auth/password
// Body: { currentPassword, newPassword }
// Any signed-in, ACTIVE user (customer or admin) may change their OWN password.
export async function POST(request: Request) {
    // 1. Who is asking? Taken from the login session, never from the browser,
    //    so nobody can change someone else's password.
    const auth = await authorizeApi();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    // 2. Read and check the input.
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const input = parsePasswordChange(body);
    if (!input.ok) {
        return NextResponse.json({ error: input.error }, { status: 400 });
    }

    try {
        // 3. Too many wrong "current password" tries? Wait first (stops guessing
        //    with a stolen session).
        const limitKey = `password|${user.userId}`;
        const waitSeconds = getLockSeconds(limitKey);
        if (waitSeconds > 0) {
            return NextResponse.json(
                {
                    error: `Too many wrong passwords. Try again in ${Math.ceil(waitSeconds / 60)} minute(s).`,
                },
                { status: 429, headers: { "Retry-After": String(waitSeconds) } },
            );
        }

        // 4. The current password must be right (bcrypt compare).
        const [rows] = await getPool().execute<HashRow[]>(
            "SELECT password_hash FROM users WHERE user_id = ?",
            [user.userId],
        );
        const currentOk = await verifyPassword(
            input.value.currentPassword,
            rows[0]?.password_hash ?? DUMMY_HASH,
        );
        if (!currentOk) {
            recordFailure(limitKey);
            return NextResponse.json({ error: "Your current password is incorrect." }, { status: 403 });
        }
        clearFailures(limitKey);

        // 5. Store only the bcrypt hash of the new password. The password itself is never saved or logged.
        const newHash = await bcrypt.hash(input.value.newPassword, 10);
        await getPool().execute("UPDATE users SET password_hash = ? WHERE user_id = ?", [
            newHash,
            user.userId,
        ]);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Password change error:", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: "Could not change the password. Please try again." },
            { status: 500 },
        );
    }
}