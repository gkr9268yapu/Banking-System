import type { RowDataPacket } from "mysql2";
import { BANK_NAME } from "@/lib/config";
import { getPool } from "@/lib/db";

// All the numbers for the customer dashboard.
// accountId must come from the session (getCurrentUser), never from the browser.
// Money stays as text from the database (DECIMAL), and sums and the net amount
// are calculated in SQL. Only the chart values become numbers, because a chart
// only draws them and never does money math with them.

const MONTH_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export type MonthTotals = { label: string; sent: number; received: number };

export type RecentTransaction = {
    id: number;
    otherParty: string;
    type: string; // TRANSFER, QR_PAY, DEPOSIT or WITHDRAW
    amount: string;
    direction: "SENT" | "RECEIVED";
    date: string; // for example "Oct 16"
};

export type QuickPayPerson = {
    name: string;
    accountNumber: string;
    lastAmount: string;
};

export type DashboardData = {
    balance: string; // DECIMAL as text, for example "5000.00"
    transactionsThisMonth: number;
    netThisMonth: string; // received minus sent, can be negative
    months: MonthTotals[]; // the last 6 months, oldest first
    recent: RecentTransaction[];
    quickPay: QuickPayPerson[];
};

interface NowRow extends RowDataPacket {
    this_month: string;
}
interface BalanceRow extends RowDataPacket {
    balance: string;
}
interface MonthRow extends RowDataPacket {
    month: string;
    sent: string;
    received: string;
}
interface CountRow extends RowDataPacket {
    txn_count: number | string;
    net: string;
}
interface RecentRow extends RowDataPacket {
    txn_id: number;
    amount: string;
    type: string;
    direction: "SENT" | "RECEIVED";
    other_party: string | null;
    date_label: string;
}
interface QuickPayRow extends RowDataPacket {
    full_name: string;
    account_number: string;
    amount: string;
}

// Moves a "YYYY-MM" text forward or backward by whole months.
// shiftMonth("2026-01", -2) is "2025-11".
function shiftMonth(monthKey: string, delta: number): string {
    const [year, month] = monthKey.split("-").map(Number);
    const index = year * 12 + (month - 1) + delta;
    const newYear = Math.floor(index / 12);
    const newMonth = (index % 12) + 1;
    return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

export async function getDashboardData(accountId: number): Promise<DashboardData> {
    const pool = getPool();

    // Ask the database what the current month is, so the month names in the
    // charts always match the month names the queries below produce.
    const [nowRows] = await pool.execute<NowRow[]>(
        "SELECT DATE_FORMAT(CURDATE(), '%Y-%m') AS this_month",
    );
    const thisMonth = nowRows[0].this_month;

    // Exactly 6 calendar months, for example May to Oct.
    const monthKeys = [-5, -4, -3, -2, -1, 0].map((back) => shiftMonth(thisMonth, back));
    const firstDay = `${monthKeys[0]}-01`; // start of the oldest month
    const thisMonthStart = `${thisMonth}-01`;
    const nextMonthStart = `${shiftMonth(thisMonth, 1)}-01`;

    const [account, monthly, thisMonthStats, recent, quickPay] = await Promise.all([
        // Current balance
        pool.execute<BalanceRow[]>("SELECT balance FROM accounts WHERE account_id = ?", [
            accountId,
        ]),

        // Money sent and received per month (section 7 query, limited to 6 months)
        pool.execute<MonthRow[]>(
            `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
              SUM(CASE WHEN from_account = ? THEN amount ELSE 0 END) AS sent,
              SUM(CASE WHEN to_account   = ? THEN amount ELSE 0 END) AS received
         FROM transactions
        WHERE status = 'SUCCESS'
          AND (from_account = ? OR to_account = ?)
          AND created_at >= ? AND created_at < ?
        GROUP BY month
        ORDER BY month`,
            [accountId, accountId, accountId, accountId, firstDay, nextMonthStart],
        ),

        // Number of transactions this month and the net amount (received - sent)
        pool.execute<CountRow[]>(
            `SELECT COUNT(*) AS txn_count,
              COALESCE(SUM(CASE WHEN to_account = ? THEN amount ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN from_account = ? THEN amount ELSE 0 END), 0) AS net
         FROM transactions
        WHERE status = 'SUCCESS'
          AND (from_account = ? OR to_account = ?)
          AND created_at >= ? AND created_at < ?`,
            [accountId, accountId, accountId, accountId, thisMonthStart, nextMonthStart],
        ),

        // Last 5 transactions with the name of the other person
        // (deposits and withdrawals have no other person: the bank is the other side)
        pool.execute<RecentRow[]>(
            `SELECT t.txn_id, t.amount, t.type,
              CASE WHEN t.from_account = ? THEN 'SENT' ELSE 'RECEIVED' END AS direction,
              u.full_name AS other_party,
              DATE_FORMAT(t.created_at, '%b %e') AS date_label
         FROM transactions t
         LEFT JOIN accounts a ON a.account_id = IF(t.from_account = ?, t.to_account, t.from_account)
         LEFT JOIN users u ON u.user_id = a.user_id
        WHERE t.status = 'SUCCESS' AND (t.from_account = ? OR t.to_account = ?)
        ORDER BY t.created_at DESC, t.txn_id DESC
        LIMIT 5`,
            [accountId, accountId, accountId, accountId],
        ),

        // Quick pay: the people I paid most recently, one row per person, showing
        // the amount of my latest payment to them. Only people who can receive
        // money right now (ACTIVE user and ACTIVE account) are listed.
        pool.execute<QuickPayRow[]>(
            `SELECT ranked.full_name, ranked.account_number, ranked.amount
         FROM (
               SELECT u.full_name, a.account_number, t.amount, t.created_at,
                      ROW_NUMBER() OVER (
                        PARTITION BY t.to_account
                        ORDER BY t.created_at DESC, t.txn_id DESC
                      ) AS rn
                 FROM transactions t
                 JOIN accounts a ON a.account_id = t.to_account
                 JOIN users u ON u.user_id = a.user_id
                WHERE t.from_account = ?
                  AND t.status = 'SUCCESS'
                  AND t.type IN ('TRANSFER', 'QR_PAY')
                  AND u.status = 'ACTIVE'
                  AND a.status = 'ACTIVE'
              ) ranked
        WHERE ranked.rn = 1
        ORDER BY ranked.created_at DESC
        LIMIT 5`,
            [accountId],
        ),
    ]);

    // Months without any transaction are not in the query result: add them as 0.
    const totalsByMonth = new Map(monthly[0].map((row) => [row.month, row]));
    const months = monthKeys.map((key) => {
        const row = totalsByMonth.get(key);
        return {
            label: MONTH_NAMES[Number(key.slice(5)) - 1],
            sent: Number(row?.sent ?? 0),
            received: Number(row?.received ?? 0),
        };
    });

    const stats = thisMonthStats[0][0];
    if (!account[0][0]) throw new Error("Account not found");

    return {
        balance: account[0][0].balance,
        transactionsThisMonth: Number(stats.txn_count),
        netThisMonth: stats.net,
        months,
        recent: recent[0].map((row) => ({
            id: row.txn_id,
            otherParty: row.other_party ?? BANK_NAME,
            type: row.type,
            amount: row.amount,
            direction: row.direction,
            date: row.date_label,
        })),
        quickPay: quickPay[0].map((row) => ({
            name: row.full_name,
            accountNumber: row.account_number,
            lastAmount: row.amount,
        })),
    };
}