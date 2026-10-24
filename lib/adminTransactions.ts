import type { RowDataPacket } from "mysql2";
import { BANK_NAME } from "@/lib/config";
import { getPool } from "@/lib/db";

// ALL transactions of ALL customers, with filters and pages (admin only).
// The page that calls this has already checked, on the server, that the user is an ADMIN.

export const ADMIN_PAGE_SIZE = 20;

export type TypeFilter = "all" | "transfer" | "qr_pay" | "deposit" | "withdraw";

export type AdminTxnFilters = {
    type: TypeFilter;
    q: string; // part of a customer name or account number
    from: string | null; // "YYYY-MM-DD" or null
    to: string | null;
    page: number;
};

export type AdminTxnItem = {
    id: number;
    from: string; // the bank for a deposit
    to: string; // the bank for a withdrawal
    type: string;
    amount: string;
    status: "SUCCESS" | "FAILED";
    note: string | null;
    date: string; // for example "Oct 16, 2026"
    time: string; // for example "2:15 PM"
};

export type AdminTxnPage = {
    items: AdminTxnItem[];
    total: number;
    page: number;
    pageCount: number;
};

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const TYPE_FILTERS: TypeFilter[] = ["all", "transfer", "qr_pay", "deposit", "withdraw"];

// Same check as in lib/transactions.ts: is this a real calendar date?
function isRealDate(text: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    const date = new Date(`${text}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

// Turns the address bar values (?type=deposit&q=ayesha&from=...&to=...&page=2)
// into clean filters. Anything unexpected gives an error, never a database query.
export function parseAdminTxnFilters(params: Record<string, unknown>): Result<AdminTxnFilters> {
    const first = (value: unknown) => (typeof value === "string" ? value.trim() : "");

    const typeText = first(params.type) || "all";
    const type = TYPE_FILTERS.find((t) => t === typeText);
    if (!type) return { ok: false, error: "Unknown filter." };

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

    return {
        ok: true,
        value: { type, q: first(params.q).slice(0, 100), from, to, page: Number(pageText) },
    };
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
    from_name: string | null;
    to_name: string | null;
    date_label: string;
    time_label: string;
}

// The tables used by both queries: sender and receiver (account and user each).
// Deposits have no sender and withdrawals have no receiver, hence LEFT JOIN.
const FROM_CLAUSE = `
  FROM transactions t
  LEFT JOIN accounts fa ON fa.account_id = t.from_account
  LEFT JOIN users fu ON fu.user_id = fa.user_id
  LEFT JOIN accounts ta ON ta.account_id = t.to_account
  LEFT JOIN users tu ON tu.user_id = ta.user_id`;

export async function getAdminTransactions(filters: AdminTxnFilters): Promise<AdminTxnPage> {
    const pool = getPool();

    // Build the WHERE part. The SQL text only contains fixed pieces chosen here.
    // Every value from the browser goes in as a "?" parameter.
    const conditions: string[] = [];
    const params: string[] = [];

    if (filters.type !== "all") {
        conditions.push("t.type = ?");
        params.push(filters.type.toUpperCase()); // "qr_pay" -> "QR_PAY"
    }
    if (filters.q) {
        // "!" is the escape character, so a typed % or _ is not a wildcard.
        const like = `%${filters.q.replace(/[!%_]/g, "!$&")}%`;
        conditions.push(
            `(fu.full_name LIKE ? ESCAPE '!' OR tu.full_name LIKE ? ESCAPE '!'
        OR fa.account_number LIKE ? ESCAPE '!' OR ta.account_number LIKE ? ESCAPE '!')`,
        );
        params.push(like, like, like, like);
    }
    if (filters.from) {
        conditions.push("t.created_at >= ?");
        params.push(filters.from);
    }
    if (filters.to) {
        // "to" is a whole day: go up to (not including) the next day.
        conditions.push("t.created_at < DATE_ADD(?, INTERVAL 1 DAY)");
        params.push(filters.to);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [countRows] = await pool.execute<CountRow[]>(
        `SELECT COUNT(*) AS total ${FROM_CLAUSE} ${where}`,
        params,
    );
    const total = Number(countRows[0].total);
    const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

    // A page number that is too high shows the last page.
    const page = Math.min(filters.page, pageCount);

    // LIMIT and OFFSET are whole numbers calculated here, not text from the browser.
    const offset = (page - 1) * ADMIN_PAGE_SIZE;

    const [rows] = await pool.execute<TxnRow[]>(
        `SELECT t.txn_id, t.amount, t.type, t.status, t.note,
            fu.full_name AS from_name, tu.full_name AS to_name,
            DATE_FORMAT(t.created_at, '%b %e, %Y') AS date_label,
            DATE_FORMAT(t.created_at, '%l:%i %p') AS time_label
       ${FROM_CLAUSE}
       ${where}
      ORDER BY t.created_at DESC, t.txn_id DESC
      LIMIT ${ADMIN_PAGE_SIZE} OFFSET ${offset}`,
        params,
    );

    return {
        items: rows.map((row) => ({
            id: row.txn_id,
            from: row.from_name ?? BANK_NAME,
            to: row.to_name ?? BANK_NAME,
            type: row.type,
            amount: row.amount,
            status: row.status,
            note: row.note,
            date: row.date_label,
            time: row.time_label,
        })),
        total,
        page,
        pageCount,
    };
}