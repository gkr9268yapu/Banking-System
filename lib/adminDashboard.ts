import type { RowDataPacket } from "mysql2";
import { BANK_NAME } from "@/lib/config";
import { getPool } from "@/lib/db";

// All the numbers for the ADMIN dashboard (section 5.5 of the spec).
// The page that calls this has already checked, on the server, that the
// user is an ADMIN. Money stays as text (DECIMAL). Sums are done in SQL.
// Only the chart values become numbers, because a chart only draws them.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type DayTotals = { label: string; count: number; volume: number };

export type AdminRecentTransaction = {
    id: number;
    from: string; // name of the sender (or the bank for a deposit)
    to: string; // name of the receiver (or the bank for a withdrawal)
    type: string;
    amount: string;
    date: string; // for example "Oct 16"
    time: string; // for example "2:15 PM"
};

export type AdminCustomerRow = {
    id: number;
    name: string;
    balance: string | null; // null if the customer has no account
    status: string;
};

export type AdminDashboardData = {
    totalCustomers: number;
    activeCustomers: number;
    totalMoney: string; // DECIMAL as text
    transactionsToday: number;
    days: DayTotals[]; // the last 7 days, oldest first, today last
    recent: AdminRecentTransaction[];
    customers: AdminCustomerRow[];
};

interface TodayRow extends RowDataPacket {
    today: string;
}
interface StatusCountRow extends RowDataPacket {
    status: string;
    total: number | string;
}
interface MoneyRow extends RowDataPacket {
    total_money: string;
}
interface DayRow extends RowDataPacket {
    day: string;
    txn_count: number | string;
    volume: string;
}
interface RecentRow extends RowDataPacket {
    txn_id: number;
    amount: string;
    type: string;
    from_name: string | null;
    to_name: string | null;
    date_label: string;
    time_label: string;
}
interface CustomerRow extends RowDataPacket {
    user_id: number;
    full_name: string;
    status: string;
    balance: string | null;
}

// Moves a "YYYY-MM-DD" text back by whole days. shiftDay("2026-03-01", -1) is "2026-02-28".
function shiftDay(dayKey: string, delta: number): string {
    const date = new Date(`${dayKey}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + delta);
    return date.toISOString().slice(0, 10);
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
    const pool = getPool();

    // Ask the database what "today" is, so the days in the charts always match
    // the days the queries below produce.
    const [todayRows] = await pool.execute<TodayRow[]>(
        "SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today",
    );
    const today = todayRows[0].today;

    // Exactly 7 days, for example Oct 14 to Oct 20.
    const dayKeys = [-6, -5, -4, -3, -2, -1, 0].map((back) => shiftDay(today, back));
    const firstDay = dayKeys[0];

    const [statusCounts, money, perDay, recent, customers] = await Promise.all([
        // How many customers per status (deleted customers are not counted below)
        pool.execute<StatusCountRow[]>(
            "SELECT status, COUNT(*) AS total FROM users WHERE role = 'CUSTOMER' GROUP BY status",
        ),

        // Total money held in the bank: the sum of every account balance
        pool.execute<MoneyRow[]>("SELECT COALESCE(SUM(balance), 0) AS total_money FROM accounts"),

        // Number of transactions and total volume per day, last 7 days
        pool.execute<DayRow[]>(
            `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day,
              COUNT(*) AS txn_count,
              COALESCE(SUM(amount), 0) AS volume
         FROM transactions
        WHERE status = 'SUCCESS'
          AND created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)
        GROUP BY day
        ORDER BY day`,
            [firstDay, today],
        ),

        // Last 5 transactions of ALL customers, with sender and receiver names.
        // Deposits have no sender and withdrawals have no receiver: the bank is that side.
        pool.execute<RecentRow[]>(
            `SELECT t.txn_id, t.amount, t.type,
              fu.full_name AS from_name,
              tu.full_name AS to_name,
              DATE_FORMAT(t.created_at, '%b %e') AS date_label,
              DATE_FORMAT(t.created_at, '%l:%i %p') AS time_label
         FROM transactions t
         LEFT JOIN accounts fa ON fa.account_id = t.from_account
         LEFT JOIN users fu ON fu.user_id = fa.user_id
         LEFT JOIN accounts ta ON ta.account_id = t.to_account
         LEFT JOIN users tu ON tu.user_id = ta.user_id
        WHERE t.status = 'SUCCESS'
        ORDER BY t.created_at DESC, t.txn_id DESC
        LIMIT 5`,
        ),

        // The dark "Customers" card: name, balance and status (deleted ones are hidden)
        pool.execute<CustomerRow[]>(
            `SELECT u.user_id, u.full_name, u.status, a.balance
         FROM users u
         LEFT JOIN accounts a ON a.user_id = u.user_id
        WHERE u.role = 'CUSTOMER' AND u.status <> 'DELETED'
        ORDER BY u.full_name
        LIMIT 8`,
        ),
    ]);

    // Customers: everyone except the deleted ones.
    let totalCustomers = 0;
    let activeCustomers = 0;
    for (const row of statusCounts[0]) {
        if (row.status !== "DELETED") totalCustomers += Number(row.total);
        if (row.status === "ACTIVE") activeCustomers = Number(row.total);
    }

    // Days without any transaction are not in the query result: add them as 0.
    const totalsByDay = new Map(perDay[0].map((row) => [row.day, row]));
    const days = dayKeys.map((key) => {
        const row = totalsByDay.get(key);
        const weekday = new Date(`${key}T00:00:00Z`).getUTCDay();
        return {
            label: WEEKDAYS[weekday],
            count: Number(row?.txn_count ?? 0),
            volume: Number(row?.volume ?? 0),
        };
    });

    return {
        totalCustomers,
        activeCustomers,
        totalMoney: money[0][0].total_money,
        // "Transactions today" is the last day of the 7 day list.
        transactionsToday: days[days.length - 1].count,
        days,
        recent: recent[0].map((row) => ({
            id: row.txn_id,
            from: row.from_name ?? BANK_NAME,
            to: row.to_name ?? BANK_NAME,
            type: row.type,
            amount: row.amount,
            date: row.date_label,
            time: row.time_label,
        })),
        customers: customers[0].map((row) => ({
            id: row.user_id,
            name: row.full_name,
            balance: row.balance,
            status: row.status,
        })),
    };
}