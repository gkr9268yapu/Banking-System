import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";
import { hasEnough } from "@/lib/money";

// The money transfer. This is the most important code in the project.
//
// All steps run inside ONE database transaction: either every step happens
// (debit, credit and the transaction record) or none of them does.

// An error that is safe to show to the customer, with the HTTP status to send.
export class TransferError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

type TransferRequest = {
    fromAccountId: number; // always from the login session, never from the browser
    toAccountNumber: string;
    amount: string; // clean text such as "250.00", checked by parseAmount()
    note: string | null;
    // Which kind of payment this is. The QR Pay route sends "QR_PAY".
    // The money logic is exactly the same, only the label in the history differs.
    type?: "TRANSFER" | "QR_PAY";
};

type TransferResult = {
    transactionId: number;
    receiverName: string;
    newBalance: string; // the sender's balance after the transfer, as text
};

interface AccountLookupRow extends RowDataPacket {
    account_id: number;
}
interface LockedAccountRow extends RowDataPacket {
    account_id: number;
    balance: string;
    status: "ACTIVE" | "FROZEN" | "CLOSED";
}
interface OwnerRow extends RowDataPacket {
    account_id: number;
    full_name: string;
    user_status: "ACTIVE" | "BLOCKED" | "DEACTIVATED" | "DELETED";
}
interface BalanceRow extends RowDataPacket {
    balance: string;
}

export async function transferMoney(request: TransferRequest): Promise<TransferResult> {
    const { fromAccountId, toAccountNumber, amount, note } = request;
    const type = request.type ?? "TRANSFER";

    // A connection is borrowed from the pool. A transaction belongs to ONE
    // connection, so every query below uses "connection", not the pool.
    const connection = await getPool().getConnection();

    try {
        // STEP 1: find the receiver's account id from the account number.
        // We need the id first, because the rows are locked in order of account_id.
        const [found] = await connection.execute<AccountLookupRow[]>(
            "SELECT account_id FROM accounts WHERE account_number = ?",
            [toAccountNumber],
        );
        if (found.length === 0) {
            throw new TransferError("No account found with that number.", 404);
        }
        const toAccountId = found[0].account_id;

        // STEP 2: no sending money to yourself.
        if (toAccountId === fromAccountId) {
            throw new TransferError("You can't send money to your own account.", 400);
        }

        // STEP 3: BEGIN. Nothing below is permanent until COMMIT.
        await connection.beginTransaction();

        // STEP 4: lock both account rows with SELECT ... FOR UPDATE.
        // While we hold the lock, no other transfer can change these two balances,
        // so two payments at the same moment cannot spend the same money twice.
        // We always lock the LOWER account_id first. If two customers send money to
        // each other at the same time, both lock in the same order, so they wait for
        // each other instead of blocking each other forever (a "deadlock").
        const [firstId, secondId] =
            fromAccountId < toAccountId
                ? [fromAccountId, toAccountId]
                : [toAccountId, fromAccountId];
        const locked = new Map<number, LockedAccountRow>();
        for (const accountId of [firstId, secondId]) {
            const [rows] = await connection.execute<LockedAccountRow[]>(
                "SELECT account_id, balance, status FROM accounts WHERE account_id = ? FOR UPDATE",
                [accountId],
            );
            if (rows.length === 0) throw new TransferError("Account not found.", 404);
            locked.set(accountId, rows[0]);
        }
        const sender = locked.get(fromAccountId)!;
        const receiver = locked.get(toAccountId)!;

        // STEP 5: both ACCOUNTS must be ACTIVE (not frozen or closed).
        if (sender.status !== "ACTIVE") {
            throw new TransferError("Your account is not active, so you can't send money.", 403);
        }
        if (receiver.status !== "ACTIVE") {
            throw new TransferError("This account can't receive money right now.", 400);
        }

        // STEP 6: both USERS must be ACTIVE (not blocked, deactivated or deleted).
        const [owners] = await connection.execute<OwnerRow[]>(
            `SELECT a.account_id, u.full_name, u.status AS user_status
         FROM accounts a
         JOIN users u ON u.user_id = a.user_id
        WHERE a.account_id IN (?, ?)`,
            [fromAccountId, toAccountId],
        );
        const senderOwner = owners.find((row) => row.account_id === fromAccountId);
        const receiverOwner = owners.find((row) => row.account_id === toAccountId);
        if (!senderOwner || senderOwner.user_status !== "ACTIVE") {
            throw new TransferError("Your profile is not active, so you can't send money.", 403);
        }
        if (!receiverOwner || receiverOwner.user_status !== "ACTIVE") {
            throw new TransferError("This account can't receive money right now.", 400);
        }

        // STEP 7: enough money? The balance was read AFTER locking, so it is current.
        // The database does not enforce balance >= 0 here (the CHECK rule is off),
        // so this check in our code is what protects the account.
        if (!hasEnough(sender.balance, amount)) {
            throw new TransferError("Insufficient balance.", 400);
        }

        // STEP 8: take the money from the sender.
        // CAST(? AS DECIMAL(15,2)) keeps the maths exact inside the database.
        // Without it MySQL would turn the text into a floating-point number.
        // "AND balance >= ..." is a second safety net against a negative balance.
        const [debit] = await connection.execute<ResultSetHeader>(
            `UPDATE accounts
          SET balance = balance - CAST(? AS DECIMAL(15,2))
        WHERE account_id = ? AND balance >= CAST(? AS DECIMAL(15,2))`,
            [amount, fromAccountId, amount],
        );
        if (debit.affectedRows !== 1) {
            throw new TransferError("Insufficient balance.", 400);
        }

        // STEP 9: give the money to the receiver.
        await connection.execute(
            "UPDATE accounts SET balance = balance + CAST(? AS DECIMAL(15,2)) WHERE account_id = ?",
            [amount, toAccountId],
        );

        // STEP 10: write the record that shows up in both customers' history.
        const [inserted] = await connection.execute<ResultSetHeader>(
            `INSERT INTO transactions (from_account, to_account, amount, type, status, note)
       VALUES (?, ?, ?, ?, 'SUCCESS', ?)`,
            [fromAccountId, toAccountId, amount, type, note],
        );

        // STEP 11: read the sender's new balance (still inside the transaction).
        const [after] = await connection.execute<BalanceRow[]>(
            "SELECT balance FROM accounts WHERE account_id = ?",
            [fromAccountId],
        );

        // STEP 12: COMMIT makes everything permanent at the same moment
        // and releases the two locks.
        await connection.commit();

        return {
            transactionId: inserted.insertId,
            receiverName: receiverOwner.full_name,
            newBalance: after[0].balance,
        };
    } catch (error) {
        // ROLLBACK undoes every change made since BEGIN, so a failure half way
        // can never leave money taken from one account but not given to the other.
        // (If BEGIN was never reached, rollback does nothing.)
        try {
            await connection.rollback();
        } catch {
            // The connection itself is broken, nothing more we can do here.
        }
        throw error;
    } finally {
        // Always give the connection back to the pool.
        connection.release();
    }
}