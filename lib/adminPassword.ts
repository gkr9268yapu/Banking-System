import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { AdminActionError } from "@/lib/adminCustomers";
import { getPool } from "@/lib/db";

// The admin sets a new password for a customer (for example after the customer
// forgot it). The password change and its audit log row are saved in ONE
// database transaction, so one can never happen without the other.

interface TargetRow extends RowDataPacket {
    user_id: number;
    full_name: string;
    email: string;
    role: "ADMIN" | "CUSTOMER";
    status: "ACTIVE" | "BLOCKED" | "DEACTIVATED" | "DELETED";
}

export async function resetCustomerPassword(
    adminId: number, // from the login session
    targetUserId: number,
    newPassword: string,
): Promise<void> {
    // The admin changes their own password in Settings, not here.
    if (targetUserId === adminId) {
        throw new AdminActionError("Use Settings to change your own password.", 400);
    }

    // bcrypt is slow on purpose, so it runs BEFORE the transaction starts.
    // Only the hash is stored. The password itself is never saved or logged.
    const newHash = await bcrypt.hash(newPassword, 10);

    const connection = await getPool().getConnection();
    try {
        await connection.beginTransaction();

        // Lock the customer's row so a status change at the same moment cannot
        // slip in between the check and the update.
        const [rows] = await connection.execute<TargetRow[]>(
            "SELECT user_id, full_name, email, role, status FROM users WHERE user_id = ? FOR UPDATE",
            [targetUserId],
        );
        const target = rows[0];

        // Only customers can be changed here. Admin accounts are never touched.
        if (!target || target.role !== "CUSTOMER") {
            throw new AdminActionError("Customer not found.", 404);
        }
        if (target.status === "DELETED") {
            throw new AdminActionError("You can't change the password of a deleted customer.", 409);
        }

        await connection.execute("UPDATE users SET password_hash = ? WHERE user_id = ?", [
            newHash,
            targetUserId,
        ]);

        // The audit row says who did it and to whom. It never contains the password.
        const details = `Password reset for ${target.full_name} (${target.email})`;
        await connection.execute(
            "INSERT INTO admin_audit_log (admin_id, action, target_user_id, details) VALUES (?, 'RESET_PASSWORD', ?, ?)",
            [adminId, targetUserId, details.slice(0, 255)],
        );

        await connection.commit();
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