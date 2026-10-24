import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { authorizeApi, DUMMY_HASH, verifyPassword } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { clearFailures, getLockSeconds, recordFailure } from "@/lib/rateLimit";
import { TransferError, transferMoney } from "@/lib/transfer";
import { parseTransferInput } from "@/lib/validators";

interface HashRow extends RowDataPacket {
    password_hash: string;
}

// POST /api/transfer
// Body: { toAccountNumber, amount, note, password }
export async function POST(request: Request) {
    // 1. Only a signed-in, ACTIVE customer may send money.
    const auth = await authorizeApi("CUSTOMER");
    if (!auth.ok) return auth.response;

    // 2. The sender is taken from the login session. The browser never says
    //    "send from account X", so nobody can spend someone else's money.
    const user = auth.user;
    if (user.accountId === null) {
        return NextResponse.json({ error: "We could not find your account." }, { status: 404 });
    }

    // 3. Read and check the input (amount, account number, note, password).
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const input = parseTransferInput(body);
    if (!input.ok) {
        return NextResponse.json({ error: input.error }, { status: 400 });
    }

    try {
        // 4. Confirm the password with bcrypt BEFORE any money moves.
        //    Too many wrong passwords in a row lock this check for a while,
        //    so a stolen session cannot be used to guess the password.
        const limitKey = `transfer|${user.userId}`;
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
            [user.userId],
        );
        const passwordOk = await verifyPassword(
            input.value.password,
            rows[0]?.password_hash ?? DUMMY_HASH,
        );
        if (!passwordOk) {
            recordFailure(limitKey);
            return NextResponse.json({ error: "Incorrect password." }, { status: 403 });
        }
        clearFailures(limitKey);

        // 5. Move the money (one database transaction, see lib/transfer.ts).
        const result = await transferMoney({
            fromAccountId: user.accountId,
            toAccountNumber: input.value.toAccountNumber,
            amount: input.value.amount,
            note: input.value.note,
        });

        return NextResponse.json({
            ok: true,
            transactionId: result.transactionId,
            receiverName: result.receiverName,
            amount: input.value.amount,
            newBalance: result.newBalance,
        });
    } catch (error) {
        // Expected problems (not enough money, receiver blocked ...) have a clear message.
        if (error instanceof TransferError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        // Anything else is unexpected: log it, show a friendly message.
        console.error("Transfer error:", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: "The transfer could not be completed. No money was moved. Please try again." },
            { status: 500 },
        );
    }
}