import { CURRENCY_SYMBOL } from "@/lib/config";

// The database returns money (DECIMAL) as text, for example "5000.00".
// These helpers work on that text directly, so no floating-point math is used.
// Values from DECIMAL(15,2) never have more than 2 decimals.

const MONEY_PATTERN = /^-?\d+(\.\d+)?$/;

// What a customer may type as an amount: 1 to 13 digits, optionally followed by
// a dot and 1 or 2 decimals. "250", "250.5" and "250.50" are fine, "2.505" and "-5" are not.
const AMOUNT_PATTERN = /^\d{1,13}(\.\d{1,2})?$/;

export type MoneySign = "positive" | "negative" | "zero";

// Tells whether an amount is above, below or exactly zero.
export function moneySign(value: string): MoneySign {
    if (!MONEY_PATTERN.test(value)) {
        throw new Error(`Not a valid money value: ${value}`);
    }
    if (!/[1-9]/.test(value)) return "zero";
    return value.startsWith("-") ? "negative" : "positive";
}

// "5000.00" becomes "$5,000.00" and "-250.5" becomes "-$250.50".
// With { showPlus: true } a positive amount starts with "+": "+$1,185.00".
export function formatMoneyString(
    value: string,
    options: { showPlus?: boolean } = {},
): string {
    const sign = moneySign(value); // also checks the format
    const [whole, fraction = ""] = value.replace("-", "").split(".");
    const cents = (fraction + "00").slice(0, 2);
    const digits = whole.replace(/^0+(?=\d)/, "");
    const withCommas = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const text = `${CURRENCY_SYMBOL}${withCommas}.${cents}`;

    if (sign === "negative") return `-${text}`;
    if (sign === "positive" && options.showPlus) return `+${text}`;
    return text;
}

// Checks what the customer typed and returns it in a clean form such as "250.00".
// Returns null when it is not a valid amount: empty, zero, negative, letters,
// more than 2 decimals. The result is still text, never a JavaScript number.
export function parseAmount(input: string): string | null {
    const text = input.trim();
    if (!AMOUNT_PATTERN.test(text)) return null;
    if (!/[1-9]/.test(text)) return null; // "0" and "0.00" are not allowed

    const [whole, fraction = ""] = text.split(".");
    const cleanWhole = whole.replace(/^0+(?=\d)/, ""); // "007" becomes "7"
    return `${cleanWhole}.${(fraction + "00").slice(0, 2)}`;
}

// Turns "5000.00" into 500000 (whole cents) as a BigInt, so two money amounts
// can be compared exactly. A BigInt is an exact whole number, unlike a float.
function toCents(value: string): bigint {
    const [whole, fraction = ""] = value.split(".");
    return BigInt(whole) * BigInt(100) + BigInt((fraction + "00").slice(0, 2));
}

// Returns true when balance is at least amount (both are DECIMAL text).
export function hasEnough(balance: string, amount: string): boolean {
    return toCents(balance) >= toCents(amount);
}