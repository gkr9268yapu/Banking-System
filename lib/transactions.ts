import type { RowDataPacket } from "mysql2";
import { BANK_NAME } from "@/lib/config";
import { getPool } from "@/lib/db";

// The transaction history of ONE account, with filters and pages.
// accountId must come from the session (getCurrentUser), never from the browser.

export const PAGE_SIZE = 10;

export type Tab = "all" | "sent" | "received";

export type Filters = {
    tab: Tab;
    from: string | null; // "YYYY-MM-DD" or null
    to: string | null; // "YYYY-MM-DD" or null
    page: number; // 1, 2, 3 ...
};

export type TransactionItem = {
    id: number;
    otherParty: string;
    type: string; // TRANSFER, QR_PAY, DEPOSIT or WITHDRAW
    amount: string; // DECIMAL as text, always positive
    direction: "SENT" | "RECEIVED";
    status: "SUCCESS" | "FAILED";
    note: string | null;
    date: string; // for example "Oct 16, 2026"
};

export type TransactionPage = {
    items: TransactionItem[];
    total: number;
    page: number;
    pageCount: number;
};

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

// Checks that a text is a real calendar date such as "2026-10-16".
function isRealDate(text: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    const date = new Date(`${text}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

// Turns the values from the address bar (?tab=sent&from=...&to=...&page=2)
// into clean filters. Anything unexpected gives an error, never a database query.
export function parseFilters(params: Record<string, unknown>): Result<Filters> {
    const first = (value: unknown) => (typeof value === "string" ? value.trim() : "");

    const tabText = first(params.tab) || "all";
    if (tabText !== "all" && tabText !== "sent" && tabText !== "received") {
        return { ok: false, error: "Unknown filter." };
    }

    const from = first(params.from) || null;
    const to = first(params.to) || null;
    if ((from && !isRealDate(from)) || (to && !isRealDate(to))) {
        return { ok: false, error: "Enter valid dates." };
    }
    if (from && to && from > to) {
        return { ok: false, error: "The start date must be before the end date." };
    }

    const pageText = first(params.page) || "1";
    if (!/^\d{1,6}$/.test(pageText) || Number(pageText) < 1) {
        return { ok: false, error: "Unknown page." };
    }

    return { ok: true, value: { tab: tabText, from, to, page: Number(pageText) } };
}

interface CountRow extends RowDataPacket {
    total: number | string;
}
interface TxnRow extends RowDataPacket {
    txn_id: number;
    amount: string;
    type: string;
    status: "SUCCESS" | "FAILED";
    note: string | null;
    direction: "SENT" | "RECEIVED";
    other_party: string | null;
    date_label: string;
}

export async function getTransactions(
    accountId: number,
    filters: Filters,
): Promise<TransactionPage> {
    const pool = getPool();

    // Build the WHERE part. The SQL text only ever contains fixed pieces chosen
    // here. Every value that came from the browser goes in as a "?" parameter.
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters.tab === "sent") {
        conditions.push("t.from_account = ?");
        params.push(accountId);
    } else if (filters.tab === "received") {
        conditions.push("t.to_account = ?");
        params.push(accountId);
    } else {
        conditions.push("(t.from_account = ? OR t.to_account = ?)");
        params.push(accountId, accountId);
    }
    if (filters.from) {
        conditions.push("t.created_at >= ?");
        params.push(filters.from);
    }
    if (filters.to) {
        // "to" is a whole day, so we go up to (but not including) the next day.
        conditions.push("t.created_at < DATE_ADD(?, INTERVAL 1 DAY)");
        params.push(filters.to);
    }
    const where = conditions.join(" AND ");

    // How many rows match? Needed to know the number of pages.
    const [countRows] = await pool.execute<CountRow[]>(
        `SELECT COUNT(*) AS total FROM transactions t WHERE ${where}`,
        params,
    );
    const total = Number(countRows[0].total);
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

    // A page number that is too high shows the last page instead of an empty one.
    const page = Math.min(filters.page, pageCount);

    // LIMIT and OFFSET are written into the text on purpose: both are whole
    // numbers calculated here (page was checked to be digits only), not text from the browser.
    const offset = (page - 1) * PAGE_SIZE;

    const [rows] = await pool.execute<TxnRow[]>(
        `SELECT t.txn_id, t.amount, t.type, t.status, t.note,
            CASE WHEN t.from_account = ? THEN 'SENT' ELSE 'RECEIVED' END AS direction,
            u.full_name AS other_party,
            DATE_FORMAT(t.created_at, '%b %e, %Y') AS date_label
       FROM transactions t
       LEFT JOIN accounts a ON a.account_id = IF(t.from_account = ?, t.to_account, t.from_account)
       LEFT JOIN users u ON u.user_id = a.user_id
      WHERE ${where}
      ORDER BY t.created_at DESC, t.txn_id DESC
      LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
        [accountId, accountId, ...params],
    );

    return {
        items: rows.map((row) => ({
            id: row.txn_id,
            otherParty: row.other_party ?? BANK_NAME, // deposits and withdrawals: the bank
            type: row.type,
            amount: row.amount,
            direction: row.direction,
            status: row.status,
            note: row.note,
            date: row.date_label,
        })),
        total,
        page,
        pageCount,
    };
}