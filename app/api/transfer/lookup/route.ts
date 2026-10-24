import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { authorizeApi } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { isValidAccountNumber } from "@/lib/validators";

interface ReceiverRow extends RowDataPacket {
    account_id: number;
    full_name: string;
    account_status: "ACTIVE" | "FROZEN" | "CLOSED";
    user_status: "ACTIVE" | "BLOCKED" | "DEACTIVATED" | "DELETED";
}

// GET /api/transfer/lookup?account=1000000002
// Lets the Transfer page show WHO will receive the money before the customer sends it.
// It returns the name and a masked account number only. Never the balance.
export async function GET(request: Request) {
    const auth = await authorizeApi("CUSTOMER");
    if (!auth.ok) return auth.response;

    const account = new URL(request.url).searchParams.get("account") ?? "";
    if (!isValidAccountNumber(account)) {
        return NextResponse.json({ error: "Enter a valid 10 digit account number." }, { status: 400 });
    }

    try {
        const [rows] = await getPool().execute<ReceiverRow[]>(
            `SELECT a.account_id, u.full_name, a.status AS account_status, u.status AS user_status
         FROM accounts a
         JOIN users u ON u.user_id = a.user_id
        WHERE a.account_number = ?`,
            [account],
        );
        const receiver = rows[0];

        if (!receiver) {
            return NextResponse.json({ error: "No account found with that number." }, { status: 404 });
        }
        // Compared with the account of the logged-in user (from the session).
        if (receiver.account_id === auth.user.accountId) {
            return NextResponse.json(
                { error: "You can't send money to your own account." },
                { status: 400 },
            );
        }
        if (receiver.account_status !== "ACTIVE" || receiver.user_status !== "ACTIVE") {
            return NextResponse.json(
                { error: "This account can't receive money right now." },
                { status: 400 },
            );
        }

        return NextResponse.json({
            name: receiver.full_name,
            maskedAccount: `******${account.slice(-4)}`, // for example ******0002
        });
    } catch (error) {
        console.error("Lookup error:", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: "Could not look up the account. Please try again." },
            { status: 500 },
        );
    }
}