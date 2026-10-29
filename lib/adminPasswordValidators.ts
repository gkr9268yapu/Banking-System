import { MIN_PASSWORD_LENGTH } from "@/lib/passwordValidators";
import { isValidPasswordLength } from "@/lib/validators";

// Input checks for "admin resets a customer's password". Own file, so the
// other validator files stay untouched. The body starts as "unknown".

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export type ResetPasswordInput = {
    newPassword: string; // the new password for the customer
    adminPassword: string; // the admin's OWN password, to confirm it is really the admin
};

export function parseResetPassword(body: unknown): Result<ResetPasswordInput> {
    if (typeof body !== "object" || body === null) {
        return { ok: false, error: "Invalid request." };
    }
    const { newPassword, adminPassword } = body as Record<string, unknown>;

    if (
        typeof newPassword !== "string" ||
        newPassword.length < MIN_PASSWORD_LENGTH ||
        !isValidPasswordLength(newPassword)
    ) {
        return {
            ok: false,
            error: `The new password must have at least ${MIN_PASSWORD_LENGTH} characters (72 at most).`,
        };
    }
    if (typeof adminPassword !== "string" || !isValidPasswordLength(adminPassword)) {
        return { ok: false, error: "Enter your own password to confirm." };
    }

    return { ok: true, value: { newPassword, adminPassword } };
}