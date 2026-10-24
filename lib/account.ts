import type { RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";

export type AccountStatus = "ACTIVE" | "FROZEN" | "CLOSED";

export type AccountOverview = {
    fullName: string;
    email: string;
    phone: string | null;
    memberSince: string; // for example "Oct 12, 2026"
    accountNumber: string;
    balance: string; // DECIMAL as text, for example "5000.00"
    accountStatus: AccountStatus;
};

interface OverviewRow extends RowDataPacket {
    full_name: string;
    email: string;
    phone: string | null;
    member_since: string;
    account_number: string;
    balance: string;
    account_status: AccountStatus;
}

// Profile and account details for one account.
// accountId must come from the session (getCurrentUser), never from the browser.
export async function getAccountOverview(
    accountId: number,
): Promise<AccountOverview | null> {
    const [rows] = await getPool().execute<OverviewRow[]>(
        `SELECT u.full_name, u.email, u.phone,
            DATE_FORMAT(u.created_at, '%b %e, %Y') AS member_since,
            a.account_number, a.balance, a.status AS account_status
       FROM accounts a
       JOIN users u ON u.user_id = a.user_id
      WHERE a.account_id = ?`,
        [accountId],
    );
    const row = rows[0];
    if (!row) return null;

    return {
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        memberSince: row.member_since,
        accountNumber: row.account_number,
        balance: row.balance,
        accountStatus: row.account_status,
    };
}