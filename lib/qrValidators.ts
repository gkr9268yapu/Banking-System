import { parseAmount } from "@/lib/money";
import { isValidPasswordLength } from "@/lib/validators";

// Input checks for QR Pay. They live in their own file so lib/validators.ts
// stays untouched. Every value starts as "unknown" and is checked before use.

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

// The text inside every QR image is "BANKPAY:" followed by the token.
export const QR_PREFIX = "BANKPAY:";

// A token is letters and digits only (ours are 32 hex characters), at most 64.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

// Takes the scanned text "BANKPAY:abc123..." and returns just the token.
export function parseQrPayload(value: unknown): Result<string> {
    const invalid = { ok: false, error: "This is not a GKR Bank QR code." } as const;

    if (typeof value !== "string") return invalid;
    const text = value.trim();
    if (!text.startsWith(QR_PREFIX)) return invalid;

    const token = text.slice(QR_PREFIX.length);
    if (!TOKEN_PATTERN.test(token)) return invalid;
    return { ok: true, value: token };
}

export type QrPayInput = {
    token: string;
    amount: string; // clean text such as "250.00"
    note: string | null;
    password: string;
};

// Checks the body of POST /api/qr/pay.
// The payer is NOT in it: the payer always comes from the login session.
export function parseQrPayInput(body: unknown): Result<QrPayInput> {
    if (typeof body !== "object" || body === null) {
        return { ok: false, error: "Invalid request." };
    }
    const { payload, amount, note, password } = body as Record<string, unknown>;

    const token = parseQrPayload(payload);
    if (!token.ok) return token;

    // The amount must arrive as text so it never becomes a floating-point number.
    const cleanAmount = typeof amount === "string" ? parseAmount(amount) : null;
    if (!cleanAmount) {
        return { ok: false, error: "Enter an amount above 0 with at most 2 decimals." };
    }

    let cleanNote: string | null = null;
    if (note !== undefined && note !== null) {
        if (typeof note !== "string" || note.trim().length > 255) {
            return { ok: false, error: "The note can be at most 255 characters." };
        }
        cleanNote = note.trim() === "" ? null : note.trim();
    }

    if (typeof password !== "string" || !isValidPasswordLength(password)) {
        return { ok: false, error: "Enter your password to confirm the payment." };
    }

    return {
        ok: true,
        value: { token: token.value, amount: cleanAmount, note: cleanNote, password },
    };
}