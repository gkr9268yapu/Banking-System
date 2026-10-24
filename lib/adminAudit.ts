import type { RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";

// The audit log: one row for every admin action (admin only).
// The page or API route that calls this has already checked the user is an ADMIN.

export const AUDIT_PAGE_SIZE = 20;

export type AuditItem = {
    id: number;
    admin: string; // name of the admin who did it
    action: string; // for example BLOCK_USER or DEPOSIT
    target: string | null; // name of the customer it was done to
    details: string | null;
    date: string; // for example "Oct 16, 2026"
    time: string; // for example "2:15 PM"
};

export type AuditPage = {
    items: AuditItem[];
    total: number;
    page: number;
    pageCount: number;
};

// Reads ?page=2. Anything that is not a plain positive number becomes page 1.
export function parsePage(value: unknown): number {
    return typeof value === "string" && /^\d{1,6}$/.test(value) && Number(value) >= 1
        ? Number(value)
        : 1;
}

interface CountRow extends RowDataPacket {
    total: number | string;
}
interface LogRow extends RowDataPacket {
    log_id: number;
    admin_name: string;
    action: string;
    target_name: string | null;
    details: string | null;
    date_label: string;
    time_label: string;
}

export async function getAuditLog(requestedPage: number): Promise<AuditPage> {
    const pool = getPool();

    const [countRows] = await pool.execute<CountRow[]>(
        "SELECT COUNT(*) AS total FROM admin_audit_log",
    );
    const total = Number(countRows[0].total);
    const pageCount = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
    const page = Math.min(requestedPage, pageCount);

    // LIMIT and OFFSET are whole numbers calculated here, not text from the browser.
    const offset = (page - 1) * AUDIT_PAGE_SIZE;

    // The admin always exists. The target can be empty (an action without a customer).
    const [rows] = await pool.execute<LogRow[]>(
        `SELECT l.log_id, au.full_name AS admin_name, l.action, tu.full_name AS target_name,
            l.details,
            DATE_FORMAT(l.created_at, '%b %e, %Y') AS date_label,
            DATE_FORMAT(l.created_at, '%l:%i %p') AS time_label
       FROM admin_audit_log l
       JOIN users au ON au.user_id = l.admin_id
       LEFT JOIN users tu ON tu.user_id = l.target_user_id
      ORDER BY l.created_at DESC, l.log_id DESC
      LIMIT ${AUDIT_PAGE_SIZE} OFFSET ${offset}`,
    );

    return {
        items: rows.map((row) => ({
            id: row.log_id,
            admin: row.admin_name,
            action: row.action,
            target: row.target_name,
            details: row.details,
            date: row.date_label,
            time: row.time_label,
        })),
        total,
        page,
        pageCount,
    };
}