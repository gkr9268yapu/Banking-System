import crypto from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";
import { TransferError } from "@/lib/transfer";

// Server code for QR Pay. The QR image holds only a random token. The token
// is looked up here, so the QR never contains a balance or a full account number.

interface TokenRow extends RowDataPacket {
    qr_token: string;
}

// Returns the QR token of an account. Every account normally has one already
// (it is created together with the account). If one is missing, make it now.
export async function getOrCreateQrToken(accountId: number): Promise<string> {
    const pool = getPool();
    const find = async () => {
        const [rows] = await pool.execute<TokenRow[]>(
            "SELECT qr_token FROM qr_codes WHERE account_id = ?",
            [accountId],
        );
        return rows[0]?.qr_token ?? null;
    };

    const existing = await find();
    if (existing) return existing;

    try {
        // 16 random bytes written as 32 hex characters. Impossible to guess.
        const token = crypto.randomBytes(16).toString("hex");
        await pool.execute("INSERT INTO qr_codes (account_id, qr_token) VALUES (?, ?)", [
            accountId,
            token,
        ]);
        return token;
    } catch (error) {
        // account_id is UNIQUE: if another request created it first, use that one.
        if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
            const created = await find();
            if (created) return created;
        }
        throw error;
    }
}

export type QrReceiver = {
    accountNumber: string; // used on the server only, never sent to the browser
    name: string;
    maskedAccount: string; // for example ******0002
};

interface ReceiverRow extends RowDataPacket {
    account_id: number;
    account_number: string;
    full_name: string;
    account_status: "ACTIVE" | "FROZEN" | "CLOSED";
    user_status: "ACTIVE" | "BLOCKED" | "DEACTIVATED" | "DELETED";
}

// Turns a token into the receiver. Throws TransferError (safe to show) when the
// QR is unknown, it is the payer's own QR, or the receiver cannot receive money.
export async function resolveQrToken(
    token: string,
    payerAccountId: number, // from the login session
): Promise<QrReceiver> {
    const [rows] = await getPool().execute<ReceiverRow[]>(
        `SELECT a.account_id, a.account_number, u.full_name,
            a.status AS account_status, u.status AS user_status
       FROM qr_codes q
       JOIN accounts a ON a.account_id = q.account_id
       JOIN users u ON u.user_id = a.user_id
      WHERE q.qr_token = ?`,
        [token],
    );
    const row = rows[0];

    if (!row) throw new TransferError("This QR code is not valid.", 404);
    if (row.account_id === payerAccountId) {
        throw new TransferError("You can't pay your own QR code.", 400);
    }
    if (row.account_status !== "ACTIVE" || row.user_status !== "ACTIVE") {
        throw new TransferError("This account can't receive money right now.", 400);
    }

    return {
        accountNumber: row.account_number,
        name: row.full_name,
        maskedAccount: `******${row.account_number.slice(-4)}`,
    };
}