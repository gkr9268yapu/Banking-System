import { parseAmount } from "@/lib/money";

// Server-side input checks. Never trust what the browser sends.

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Account numbers in this bank are exactly 10 digits.
const ACCOUNT_NUMBER_PATTERN = /^\d{10}$/;

export function isValidEmail(value: string): boolean {
  return value.length <= 100 && EMAIL_PATTERN.test(value);
}

export function isValidAccountNumber(value: string): boolean {
  return ACCOUNT_NUMBER_PATTERN.test(value);
}

// bcrypt only reads the first 72 bytes of a password, so longer ones are refused.
export function isValidPasswordLength(value: string): boolean {
  const bytes = new TextEncoder().encode(value).length;
  return bytes > 0 && bytes <= 72;
}

export type LoginInput = { email: string; password: string };

export function parseLoginInput(body: unknown): Result<LoginInput> {
  const invalid = { ok: false, error: "Please enter a valid email and password." } as const;

  if (typeof body !== "object" || body === null) return invalid;
  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string") return invalid;

  const cleanEmail = email.trim().toLowerCase();
  if (!isValidEmail(cleanEmail) || !isValidPasswordLength(password)) return invalid;

  return { ok: true, value: { email: cleanEmail, password } };
}

export type TransferInput = {
  toAccountNumber: string;
  amount: string; // clean text such as "250.00"
  note: string | null;
  password: string;
};

// Checks the transfer request sent by the browser.
// The sender is NOT part of it: the sender always comes from the login session.
export function parseTransferInput(body: unknown): Result<TransferInput> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request." };
  }
  const { toAccountNumber, amount, note, password } = body as Record<string, unknown>;

  if (typeof toAccountNumber !== "string" || !isValidAccountNumber(toAccountNumber.trim())) {
    return { ok: false, error: "Enter a valid 10 digit account number." };
  }

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
    return { ok: false, error: "Enter your password to confirm the transfer." };
  }

  return {
    ok: true,
    value: {
      toAccountNumber: toAccountNumber.trim(),
      amount: cleanAmount,
      note: cleanNote,
      password,
    },
  };
}

export type CreateCustomerInput = {
  fullName: string;
  email: string;
  phone: string | null;
  password: string;
};

// Checks the "Create customer" form sent by the admin.
export function parseCreateCustomerInput(body: unknown): Result<CreateCustomerInput> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request." };
  }
  const { fullName, email, phone, password } = body as Record<string, unknown>;

  const cleanName = typeof fullName === "string" ? fullName.trim() : "";
  if (cleanName.length < 2 || cleanName.length > 100) {
    return { ok: false, error: "Enter the full name (2 to 100 characters)." };
  }

  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!isValidEmail(cleanEmail)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  // The phone number is optional: digits, spaces and + - ( ) only.
  let cleanPhone: string | null = null;
  if (phone !== undefined && phone !== null && phone !== "") {
    if (typeof phone !== "string" || !/^[0-9+()\- ]{5,20}$/.test(phone.trim())) {
      return { ok: false, error: "Enter a valid phone number (5 to 20 digits)." };
    }
    cleanPhone = phone.trim();
  }

  if (typeof password !== "string" || password.length < 8 || !isValidPasswordLength(password)) {
    return { ok: false, error: "The password must be 8 to 72 characters." };
  }

  return {
    ok: true,
    value: { fullName: cleanName, email: cleanEmail, phone: cleanPhone, password },
  };
}

export type CashInput = {
  userId: number; // the customer who gets or loses the money
  kind: "DEPOSIT" | "WITHDRAW";
  amount: string; // clean text such as "250.00"
  note: string | null;
};

// Checks the Deposit / Withdraw request sent by the admin.
export function parseCashInput(body: unknown): Result<CashInput> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request." };
  }
  const { userId, type, amount, note } = body as Record<string, unknown>;

  // The customer id may arrive as a number or as digits in a text.
  const id = typeof userId === "string" && /^\d{1,10}$/.test(userId) ? Number(userId) : userId;
  if (typeof id !== "number" || !Number.isInteger(id) || id < 1) {
    return { ok: false, error: "Choose a customer." };
  }

  if (type !== "DEPOSIT" && type !== "WITHDRAW") {
    return { ok: false, error: "Choose deposit or withdraw." };
  }

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

  return { ok: true, value: { userId: id, kind: type, amount: cleanAmount, note: cleanNote } };
}
