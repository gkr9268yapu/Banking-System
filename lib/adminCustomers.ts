import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { ACTIONS, type ActionName, type CustomerStatus } from "@/lib/customerActions";
import { getPool } from "@/lib/db";
import type { CreateCustomerInput } from "@/lib/validators";

// Everything the admin does with customers: list, look at one, change status, create.
// The pages and API routes that call these have already checked, on the server,
// that the user is an ADMIN. Every change is written to admin_audit_log in the
// SAME database transaction, so an action can never happen without its log row.

// An error that is safe to show to the admin, with the HTTP status to send.
export class AdminActionError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

// ---------- List with search and status filter ----------

export type StatusFilter = "all" | "active" | "blocked" | "deactivated" | "deleted";
export type CustomerFilters = { q: string; status: StatusFilter };

export type CustomerListItem = {
    userId: number;
    fullName: string;
    email: string;
    accountNumber: string | null;
    balance: string | null; // DECIMAL as text
    status: CustomerStatus;
};

const STATUS_FILTERS: StatusFilter[] = ["all", "active", "blocked", "deactivated", "deleted"];

// Reads ?q=...&status=... from the address bar. Unknown values fall back to the defaults.
export function parseCustomerFilters(params: Record<string, unknown>): CustomerFilters {
    const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
    const status = STATUS_FILTERS.find((s) => s === params.status) ?? "all";
    return { q, status };
}

interface ListRow extends RowDataPacket {
    user_id: number;
    full_name: string;
    email: string;
    account_number: string | null;
    balance: string | null;
    status: CustomerStatus;
}

const LIST_LIMIT = 100;

export async function listCustomers(filters: CustomerFilters): Promise<CustomerListItem[]> {
    const conditions = ["u.role = 'CUSTOMER'"];
    const params: string[] = [];

    // "All" hides deleted customers. They have their own filter.
    if (filters.status === "all") {
        conditions.push("u.status <> 'DELETED'");
    } else {
        conditions.push("u.status = ?");
        params.push(filters.status.toUpperCase());
    }

    if (filters.q) {
        // The search text goes in as a parameter. "!" is the escape character, so
        // a typed % or _ is searched as a normal character, not as a wildcard.
        const like = `%${filters.q.replace(/[!%_]/g, "!$&")}%`;
        conditions.push(
            `(u.full_name LIKE ? ESCAPE '!' OR u.email LIKE ? ESCAPE '!' OR a.account_number LIKE ? ESCAPE '!')`,
        );
        params.push(like, like, like);
    }

    const [rows] = await getPool().execute<ListRow[]>(
        `SELECT u.user_id, u.full_name, u.email, u.status, a.account_number, a.balance
       FROM users u
       LEFT JOIN accounts a ON a.user_id = u.user_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY u.full_name, u.user_id
      LIMIT ${LIST_LIMIT}`,
        params,
    );

    return rows.map((row) => ({
        userId: row.user_id,
        fullName: row.full_name,
        email: row.email,
        accountNumber: row.account_number,
        balance: row.balance,
        status: row.status,
    }));
}

// ---------- One customer ----------

export type CustomerDetail = {
    userId: number;
    fullName: string;
    email: string;
    phone: string | null;
    status: CustomerStatus;
    memberSince: string; // for example "Oct 12, 2026"
    accountId: number | null;
    accountNumber: string | null;
    accountStatus: string | null;
    balance: string | null;
};

interface DetailRow extends RowDataPacket {
    user_id: number;
    full_name: string;
    email: string;
    phone: string | null;
    status: CustomerStatus;
    member_since: string;
    account_id: number | null;
    account_number: string | null;
    account_status: string | null;
    balance: string | null;
}

export async function getCustomerDetail(userId: number): Promise<CustomerDetail | null> {
    // password_hash is never selected, so it can never reach a page.
    const [rows] = await getPool().execute<DetailRow[]>(
        `SELECT u.user_id, u.full_name, u.email, u.phone, u.status,
            DATE_FORMAT(u.created_at, '%b %e, %Y') AS member_since,
            a.account_id, a.account_number, a.status AS account_status, a.balance
       FROM users u
       LEFT JOIN accounts a ON a.user_id = u.user_id
      WHERE u.user_id = ? AND u.role = 'CUSTOMER'`,
        [userId],
    );
    const row = rows[0];
    if (!row) return null;

    return {
        userId: row.user_id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        status: row.status,
        memberSince: row.member_since,
        accountId: row.account_id,
        accountNumber: row.account_number,
        accountStatus: row.account_status,
        balance: row.balance,
    };
}

// ---------- Block, unblock, deactivate, reactivate, delete ----------

interface TargetRow extends RowDataPacket {
    user_id: number;
    full_name: string;
    email: string;
    role: "ADMIN" | "CUSTOMER";
    status: CustomerStatus;
}

export async function changeCustomerStatus(
    adminId: number, // from the login session
    targetUserId: number,
    action: ActionName,
): Promise<CustomerStatus> {
    // An admin can never change their own account.
    if (targetUserId === adminId) {
        throw new AdminActionError("You can't do this to your own account.", 400);
    }
    const rule = ACTIONS[action];

    const connection = await getPool().getConnection();
    try {
        // BEGIN: the status change and the audit row are saved together or not at all.
        await connection.beginTransaction();

        // Lock the customer's row, so two admins clicking at the same moment
        // cannot both act on the same old status.
        const [rows] = await connection.execute<TargetRow[]>(
            "SELECT user_id, full_name, email, role, status FROM users WHERE user_id = ? FOR UPDATE",
            [targetUserId],
        );
        const target = rows[0];

        // Only customers can be changed here. Admin accounts are never touched.
        if (!target || target.role !== "CUSTOMER") {
            throw new AdminActionError("Customer not found.", 404);
        }
        if (!rule.from.includes(target.status)) {
            throw new AdminActionError(
                `You can't ${rule.verb} a customer who is ${target.status.toLowerCase()}.`,
                409,
            );
        }

        // Soft delete is also just an UPDATE of the status. Nothing is ever DELETEd.
        await connection.execute("UPDATE users SET status = ? WHERE user_id = ?", [
            rule.to,
            targetUserId,
        ]);

        // The audit log row: who (admin_id), what (action), to whom, and details.
        const details = `${target.full_name} (${target.email}): ${target.status} -> ${rule.to}`;
        await connection.execute(
            "INSERT INTO admin_audit_log (admin_id, action, target_user_id, details) VALUES (?, ?, ?, ?)",
            [adminId, action, targetUserId, details.slice(0, 255)],
        );

        await connection.commit();
        return rule.to;
    } catch (error) {
        try {
            await connection.rollback();
        } catch {
            // The connection itself is broken, nothing more we can do here.
        }
        throw error;
    } finally {
        connection.release();
    }
}

// ---------- Create customer ----------

// MySQL and TiDB report a UNIQUE rule violation with this code.
function isDuplicateError(error: unknown): boolean {
    return (error as { code?: string }).code === "ER_DUP_ENTRY";
}

// A random 10 digit account number, for example "4829173650".
function randomAccountNumber(): string {
    return String(crypto.randomInt(1_000_000_000, 10_000_000_000));
}

export async function createCustomer(
    adminId: number, // from the login session
    input: CreateCustomerInput,
): Promise<{ userId: number; accountNumber: string }> {
    // bcrypt is slow on purpose, so it runs BEFORE the transaction starts.
    // That way no database locks are held while it works.
    const passwordHash = await bcrypt.hash(input.password, 10);

    const connection = await getPool().getConnection();
    try {
        // BEGIN: the user, the account, the QR token and the audit row are
        // created together. If any step fails, ROLLBACK removes all of them.
        await connection.beginTransaction();

        // 1. The user. The email column is UNIQUE, so a used email fails here.
        let userId: number;
        try {
            const [inserted] = await connection.execute<ResultSetHeader>(
                `INSERT INTO users (full_name, email, phone, password_hash, role, status)
         VALUES (?, ?, ?, ?, 'CUSTOMER', 'ACTIVE')`,
                [input.fullName, input.email, input.phone, passwordHash],
            );
            userId = inserted.insertId;
        } catch (error) {
            if (isDuplicateError(error)) {
                throw new AdminActionError("A user with this email already exists.", 409);
            }
            throw error;
        }

        // 2. The account, with a unique 10 digit number and a starting balance of 0.00.
        // account_number is UNIQUE. In the rare case that the random number is
        // already used, the database refuses it and we simply try another one.
        let accountId: number | null = null;
        let accountNumber = "";
        for (let attempt = 0; attempt < 5 && accountId === null; attempt++) {
            const candidate = randomAccountNumber();
            try {
                const [inserted] = await connection.execute<ResultSetHeader>(
                    `INSERT INTO accounts (user_id, account_number, balance, status)
           VALUES (?, ?, 0.00, 'ACTIVE')`,
                    [userId, candidate],
                );
                accountId = inserted.insertId;
                accountNumber = candidate;
            } catch (error) {
                if (!isDuplicateError(error)) throw error;
            }
        }
        if (accountId === null) {
            throw new AdminActionError("Could not create an account number. Please try again.", 500);
        }

        // 3. The QR token: 16 random bytes written as 32 hex characters.
        await connection.execute("INSERT INTO qr_codes (account_id, qr_token) VALUES (?, ?)", [
            accountId,
            crypto.randomBytes(16).toString("hex"),
        ]);

        // 4. The audit log row.
        const details = `Created ${input.fullName} (${input.email}), account ${accountNumber}`;
        await connection.execute(
            "INSERT INTO admin_audit_log (admin_id, action, target_user_id, details) VALUES (?, 'CREATE_CUSTOMER', ?, ?)",
            [adminId, userId, details.slice(0, 255)],
        );

        // COMMIT: all four rows become permanent at the same moment.
        await connection.commit();
        return { userId, accountNumber };
    } catch (error) {
        try {
            await connection.rollback();
        } catch {
            // The connection itself is broken, nothing more we can do here.
        }
        throw error;
    } finally {
        connection.release();
    }
}