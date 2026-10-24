import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { AdminActionError } from "@/lib/adminCustomers";
import { getPool } from "@/lib/db";
import { formatMoneyString, hasEnough } from "@/lib/money";
import type { CashInput } from "@/lib/validators";

// Admin deposit and withdraw (the bank adds or removes money for a customer).
//
// ONE database transaction: the balance change, the transactions row and the
// audit log row are saved together or not at all.

interface AccountRow extends RowDataPacket {
    account_id: number;
    account_number: string;
    balance: string;
    status: "ACTIVE" | "FROZEN" | "CLOSED";
}
interface UserRow extends RowDataPacket {
    full_name: string;
    role: "ADMIN" | "CUSTOMER";
    status: "ACTIVE" | "BLOCKED" | "DEACTIVATED" | "DELETED";
}
interface BalanceRow extends RowDataPacket {
    balance: string;
}

export async function adminCash(
    adminId: number, // from the login session
    input: CashInput,
): Promise<{ transactionId: number; customerName: string; newBalance: string }> {
    const { userId, kind, amount, note } = input;

    const connection = await getPool().getConnection();
    try {
        // BEGIN: nothing below is permanent until COMMIT.
        await connection.beginTransaction();

        // 1. Lock the customer's account row, so a transfer happening at the same
        // moment cannot change the balance while we are working on it.
        const [accounts] = await connection.execute<AccountRow[]>(
            "SELECT account_id, account_number, balance, status FROM accounts WHERE user_id = ? FOR UPDATE",
            [userId],
        );
        const account = accounts[0];
        if (!account) throw new AdminActionError("Customer account not found.", 404);

        // 2. The owner must be an ACTIVE customer (never an admin) with an ACTIVE account.
        const [users] = await connection.execute<UserRow[]>(
            "SELECT full_name, role, status FROM users WHERE user_id = ?",
            [userId],
        );
        const customer = users[0];
        if (!customer || customer.role !== "CUSTOMER") {
            throw new AdminActionError("Customer account not found.", 404);
        }
        if (customer.status !== "ACTIVE") {
            throw new AdminActionError("This customer is not active.", 400);
        }
        if (account.status !== "ACTIVE") {
            throw new AdminActionError("This customer's account is not active.", 400);
        }

        let transactionId: number;
        if (kind === "DEPOSIT") {
            // 3a. Deposit: add the money. CAST(... AS DECIMAL) keeps the maths exact.
            await connection.execute(
                "UPDATE accounts SET balance = balance + CAST(? AS DECIMAL(15,2)) WHERE account_id = ?",
                [amount, account.account_id],
            );
            // from_account is NULL: the money comes from the bank, not from a customer.
            const [inserted] = await connection.execute<ResultSetHeader>(
                `INSERT INTO transactions (from_account, to_account, amount, type, status, note)
         VALUES (NULL, ?, ?, 'DEPOSIT', 'SUCCESS', ?)`,
                [account.account_id, amount, note],
            );
            transactionId = inserted.insertId;
        } else {
            // 3b. Withdraw: the balance must never go below zero. The database does
            // not enforce that rule here, so this check in our code protects the account.
            if (!hasEnough(account.balance, amount)) {
                throw new AdminActionError(
                    `Insufficient balance. The account holds ${formatMoneyString(account.balance)}.`,
                    400,
                );
            }
            const [debit] = await connection.execute<ResultSetHeader>(
                `UPDATE accounts
            SET balance = balance - CAST(? AS DECIMAL(15,2))
          WHERE account_id = ? AND balance >= CAST(? AS DECIMAL(15,2))`,
                [amount, account.account_id, amount],
            );
            if (debit.affectedRows !== 1) {
                throw new AdminActionError("Insufficient balance.", 400);
            }
            // to_account is NULL: the money leaves the bank.
            const [inserted] = await connection.execute<ResultSetHeader>(
                `INSERT INTO transactions (from_account, to_account, amount, type, status, note)
         VALUES (?, NULL, ?, 'WITHDRAW', 'SUCCESS', ?)`,
                [account.account_id, amount, note],
            );
            transactionId = inserted.insertId;
        }

        // 4. Read the new balance (still inside the transaction).
        const [after] = await connection.execute<BalanceRow[]>(
            "SELECT balance FROM accounts WHERE account_id = ?",
            [account.account_id],
        );
        const newBalance = after[0].balance;

        // 5. The audit log row: which admin, what, for whom, how much.
        const details =
            `${kind === "DEPOSIT" ? "Deposit" : "Withdraw"} ${formatMoneyString(amount)} ` +
            `${kind === "DEPOSIT" ? "to" : "from"} ${customer.full_name} (${account.account_number}). ` +
            `New balance ${formatMoneyString(newBalance)}`;
        await connection.execute(
            "INSERT INTO admin_audit_log (admin_id, action, target_user_id, details) VALUES (?, ?, ?, ?)",
            [adminId, kind, userId, details.slice(0, 255)],
        );

        // COMMIT: balance, transaction row and audit row become permanent together.
        await connection.commit();
        return { transactionId, customerName: customer.full_name, newBalance };
    } catch (error) {
        // ROLLBACK undoes everything since BEGIN.
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