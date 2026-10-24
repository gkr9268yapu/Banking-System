import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { authorizeApi, DUMMY_HASH, verifyPassword } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { resolveQrToken } from "@/lib/qr";
import { parseQrPayInput } from "@/lib/qrValidators";
import { clearFailures, getLockSeconds, recordFailure } from "@/lib/rateLimit";
import { TransferError, transferMoney } from "@/lib/transfer";

interface HashRow extends RowDataPacket {
    password_hash: string;
}

// POST /api/qr/pay
// Body: { payload, amount, note, password }
// Same safety steps as /api/transfer, then the same transferMoney() with type QR_PAY.
export async function POST(request: Request) {
    // 1. Only a signed-in, ACTIVE customer may pay.
    const auth = await authorizeApi("CUSTOMER");
    if (!auth.ok) return auth.response;

    // 2. The payer comes from the login session, never from the browser.
    const user = auth.user;
    if (user.accountId === null) {
        return NextResponse.json({ error: "We could not find your account." }, { status: 404 });
    }

    // 3. Read and check the input.
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const input = parseQrPayInput(body);
    if (!input.ok) {
        return NextResponse.json({ error: input.error }, { status: 400 });
    }

    try {
        // 4. Confirm the password with bcrypt BEFORE any money moves.
        //    The wrong-password counter is shared with /api/transfer, so switching
        //    between the two pages does not give extra guesses.
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

        // 5. The token is turned into the receiver's account ON THE SERVER.
        //    The browser never sends an account number for a QR payment.
        const receiver = await resolveQrToken(input.value.token, user.accountId);

        // 6. Move the money with the same atomic code as a normal transfer.
        const result = await transferMoney({
            fromAccountId: user.accountId,
            toAccountNumber: receiver.accountNumber,
            amount: input.value.amount,
            note: input.value.note,
            type: "QR_PAY",
        });

        return NextResponse.json({
            ok: true,
            transactionId: result.transactionId,
            receiverName: result.receiverName,
            amount: input.value.amount,
            newBalance: result.newBalance,
        });
    } catch (error) {
        if (error instanceof TransferError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("QR pay error:", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: "The payment could not be completed. No money was moved. Please try again." },
            { status: 500 },
        );
    }
}