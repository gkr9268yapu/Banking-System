"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { CURRENCY_SYMBOL } from "@/lib/config";
import { formatMoneyString, parseAmount } from "@/lib/money";

export type CashCustomer = {
    userId: number;
    name: string;
    accountNumber: string;
    balance: string; // DECIMAL as text
};

type Kind = "DEPOSIT" | "WITHDRAW";
type Done = { kind: Kind; amount: string; customerName: string; newBalance: string };

const inputClass =
    "mt-1.5 w-full rounded-xl bg-surface px-4 py-3 text-sm text-ink outline-none ring-1 ring-transparent focus:ring-ink";

// Deposit / Withdraw in two steps: fill in the form, then review and confirm.
export default function CashForm({ customers }: { customers: CashCustomer[] }) {
    const router = useRouter();
    const [kind, setKind] = useState<Kind>("DEPOSIT");
    const [userId, setUserId] = useState("");
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [reviewing, setReviewing] = useState(false); // step 2: waiting for confirmation
    const [error, setError] = useState("");
    const [sending, setSending] = useState(false);
    const [done, setDone] = useState<Done | null>(null);

    const customer = customers.find((c) => String(c.userId) === userId);
    const cleanAmount = parseAmount(amount); // "250" becomes "250.00", or null if invalid
    const word = kind === "DEPOSIT" ? "Deposit" : "Withdraw";

    // Step 1 -> step 2: check the form, then show the summary.
    function handleReview(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        if (!customer) return setError("Choose a customer.");
        if (!cleanAmount) return setError("Enter an amount above 0 with at most 2 decimals.");
        setReviewing(true);
    }

    // Step 2: the admin confirmed, send it to the server.
    async function handleConfirm() {
        if (!customer || !cleanAmount) return;
        setSending(true);
        setError("");
        try {
            const response = await fetch("/api/admin/cash", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: customer.userId, type: kind, amount, note }),
            });
            const data = await response.json();

            if (response.status === 401) {
                router.replace("/login?session=ended");
                return;
            }
            if (!response.ok) {
                setError(data.error ?? "Something went wrong. Please try again.");
                setReviewing(false); // back to the form so the admin can fix it
                return;
            }
            setDone({
                kind,
                amount: data.amount,
                customerName: data.customerName,
                newBalance: data.newBalance,
            });
        } catch {
            setError("Could not reach the server. Check your connection and try again.");
            setReviewing(false);
        } finally {
            setSending(false);
        }
    }

    function startAnother() {
        setUserId("");
        setAmount("");
        setNote("");
        setError("");
        setReviewing(false);
        setDone(null);
        router.refresh(); // reload the balances shown in the list of customers
    }

    // ---------- Success ----------
    if (done) {
        return (
            <div className="max-w-xl rounded-xl bg-surface px-6 py-10 text-center">
                <CircleCheck size={44} className="mx-auto text-received" />
                <h2 className="mt-4 text-xl font-medium text-ink">
                    {done.kind === "DEPOSIT" ? "Deposit complete" : "Withdrawal complete"}
                </h2>
                <p role="status" className="mt-2 text-sm text-ink">
                    {done.kind === "DEPOSIT" ? "Added" : "Removed"}{" "}
                    <strong>{formatMoneyString(done.amount)}</strong>{" "}
                    {done.kind === "DEPOSIT" ? "to" : "from"} <strong>{done.customerName}</strong>.
                </p>
                <p className="mt-1 text-sm text-muted">
                    The new balance is {formatMoneyString(done.newBalance)}.
                </p>
                <button
                    type="button"
                    onClick={startAnother}
                    className="mt-8 rounded-xl bg-ink px-6 py-3 text-sm font-medium text-white"
                >
                    Make another
                </button>
            </div>
        );
    }

    // ---------- Step 2: review and confirm ----------
    if (reviewing && customer && cleanAmount) {
        return (
            <div className="max-w-xl rounded-xl bg-surface px-6 py-8">
                <h2 className="text-xl font-medium text-ink">Please confirm</h2>
                <p className="mt-3 text-sm text-ink">
                    {word} <strong>{formatMoneyString(cleanAmount)}</strong>{" "}
                    {kind === "DEPOSIT" ? "to" : "from"} <strong>{customer.name}</strong> (account{" "}
                    {customer.accountNumber}).
                </p>
                <p className="mt-1 text-sm text-muted">
                    Current balance: {formatMoneyString(customer.balance)}
                </p>
                {note.trim() && <p className="mt-1 text-sm text-muted">Note: {note.trim()}</p>}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                        type="button"
                        disabled={sending}
                        onClick={handleConfirm}
                        className="rounded-xl bg-ink px-6 py-3 text-sm font-medium text-white disabled:opacity-60"
                    >
                        {sending ? "Working..." : `Confirm ${word.toLowerCase()}`}
                    </button>
                    <button
                        type="button"
                        disabled={sending}
                        onClick={() => setReviewing(false)}
                        className="rounded-xl bg-white px-6 py-3 text-sm font-medium text-ink ring-1 ring-black/10"
                    >
                        Back
                    </button>
                </div>
            </div>
        );
    }

    // ---------- Step 1: the form ----------
    return (
        <form onSubmit={handleReview} noValidate className="max-w-xl space-y-5">
            <div className="flex gap-2" role="tablist" aria-label="Operation">
                {(["DEPOSIT", "WITHDRAW"] as const).map((option) => (
                    <button
                        key={option}
                        type="button"
                        role="tab"
                        aria-selected={kind === option}
                        onClick={() => setKind(option)}
                        className={`rounded-xl px-5 py-2 text-sm font-medium ${kind === option ? "bg-ink text-white" : "bg-surface text-muted"
                            }`}
                    >
                        {option === "DEPOSIT" ? "Deposit" : "Withdraw"}
                    </button>
                ))}
            </div>

            <div>
                <label htmlFor="customer" className="text-xs text-muted">
                    Customer account
                </label>
                <select
                    id="customer"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className={inputClass}
                >
                    <option value="">Choose a customer</option>
                    {customers.map((c) => (
                        <option key={c.userId} value={c.userId}>
                            {c.name} ({c.accountNumber})
                        </option>
                    ))}
                </select>
                {customer && (
                    <p className="mt-2 text-sm text-muted">
                        Current balance: <strong className="text-ink">{formatMoneyString(customer.balance)}</strong>
                    </p>
                )}
            </div>

            <div>
                <label htmlFor="amount" className="text-xs text-muted">
                    Amount
                </label>
                <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-[calc(50%+3px)] -translate-y-1/2 text-sm text-muted">
                        {CURRENCY_SYMBOL}
                    </span>
                    <input
                        id="amount"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="0.00"
                        value={amount}
                        // Only digits and one dot, at most 2 decimals.
                        onChange={(e) => {
                            const text = e.target.value;
                            if (/^\d{0,13}(\.\d{0,2})?$/.test(text)) setAmount(text);
                        }}
                        className={`${inputClass} pl-8`}
                    />
                </div>
            </div>

            <div>
                <label htmlFor="note" className="text-xs text-muted">
                    Note (optional)
                </label>
                <input
                    id="note"
                    type="text"
                    maxLength={255}
                    autoComplete="off"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className={inputClass}
                />
            </div>

            {/* role="alert" makes screen readers announce the error */}
            {error && (
                <p role="alert" className="rounded-xl bg-pastel-orange/30 px-4 py-3 text-sm text-sent">
                    {error}
                </p>
            )}

            <button type="submit" className="w-full rounded-xl bg-ink py-3 text-sm font-medium text-white">
                Review
            </button>
        </form>
    );
}