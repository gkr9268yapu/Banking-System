import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { AdminActionError } from "@/lib/adminCustomers";
import { resetCustomerPassword } from "@/lib/adminPassword";
import { parseResetPassword } from "@/lib/adminPasswordValidators";
import { authorizeApi, DUMMY_HASH, verifyPassword } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { clearFailures, getLockSeconds, recordFailure } from "@/lib/rateLimit";

interface HashRow extends RowDataPacket {
    password_hash: string;
}

// POST /api/admin/customers/12/password
// Body: { newPassword, adminPassword }
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    // 1. Only a signed-in, ACTIVE admin. The admin comes from the session.
    const auth = await authorizeApi("ADMIN");
    if (!auth.ok) return auth.response;
    const admin = auth.user;

    // 2. The id in the address must be plain digits.
    const { id } = await params;
    if (!/^\d{1,10}$/.test(id)) {
        return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    // 3. Read and check the input.
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const input = parseResetPassword(body);
    if (!input.ok) {
        return NextResponse.json({ error: input.error }, { status: 400 });
    }

    try {
        // 4. The admin must type their OWN password again (bcrypt check).
        //    Too many wrong tries lock this for a while, so a stolen admin
        //    session cannot be used to guess the admin password.
        const limitKey = `adminreset|${admin.userId}`;
        const waitSeconds = getLockSeconds(limitKey);
        if (waitSeconds > 0) {
            return NextResponse.json(
                {
                    error: `Too many wrong passwords. Try again in ${Math.ceil(waitSeconds / 60)} minute(s).`,
                },
                { status: 429, headers: { "Retry-After": String(waitSeconds) } },
            );
        }
        const [rows] = await getPool().execute<HashRow[]>(
            "SELECT password_hash FROM users WHERE user_id = ?",
            [admin.userId],
        );
        const adminOk = await verifyPassword(
            input.value.adminPassword,
            rows[0]?.password_hash ?? DUMMY_HASH,
        );
        if (!adminOk) {
            recordFailure(limitKey);
            return NextResponse.json({ error: "Your admin password is incorrect." }, { status: 403 });
        }
        clearFailures(limitKey);

        // 5. Change the password and write the audit row (one transaction).
        await resetCustomerPassword(admin.userId, Number(id), input.value.newPassword);
        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof AdminActionError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Reset password error:", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: "The password could not be changed. Nothing was changed. Please try again." },
            { status: 500 },
        );
    }
}