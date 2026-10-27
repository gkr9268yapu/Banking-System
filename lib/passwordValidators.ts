import { isValidPasswordLength } from "@/lib/validators";

// Input checks for "change password". Own file, so lib/validators.ts stays untouched.
// The body starts as "unknown" and every value is checked before it is used.

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const MIN_PASSWORD_LENGTH = 8;

export type PasswordChangeInput = { currentPassword: string; newPassword: string };

export function parsePasswordChange(body: unknown): Result<PasswordChangeInput> {
    if (typeof body !== "object" || body === null) {
        return { ok: false, error: "Invalid request." };
    }
    const { currentPassword, newPassword } = body as Record<string, unknown>;

    if (typeof currentPassword !== "string" || !isValidPasswordLength(currentPassword)) {
        return { ok: false, error: "Enter your current password." };
    }
    // bcrypt reads at most 72 bytes, so a longer password is refused (see isValidPasswordLength).
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
    if (newPassword === currentPassword) {
        return { ok: false, error: "The new password must be different from the current one." };
    }

    return { ok: true, value: { currentPassword, newPassword } };
}