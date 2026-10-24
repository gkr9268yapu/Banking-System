"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { CURRENCY_SYMBOL } from "@/lib/config";
import { formatMoneyString, parseAmount } from "@/lib/money";

type TransferFormProps = {
    initialAccount: string; // from the Quick pay "Pay" button (?to=...), or ""
    balance: string; // the sender's balance as text, only shown on screen
};

// Result of the live receiver lookup for one account number.
type Lookup = {
    forAccount: string;
    ok: boolean;
    name?: string;
    masked?: string;
    message?: string;
};

type Success = { receiverName: string; amount: string; newBalance: string };

const inputClass =
    "mt-1.5 w-full rounded-xl bg-surface px-4 py-3 text-sm text-ink outline-none ring-1 ring-transparent focus:ring-ink";

export default function TransferForm({ initialAccount, balance }: TransferFormProps) {
    const router = useRouter();
    const [account, setAccount] = useState(initialAccount);
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [password, setPassword] = useState("");
    const [lookup, setLookup] = useState<Lookup | null>(null);
    const [error, setError] = useState("");
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState<Success | null>(null);

    // Live lookup: as soon as 10 digits are typed, ask the server who owns the account.
    useEffect(() => {
        if (!/^\d{10}$/.test(account)) return;

        const controller = new AbortController(); // lets us cancel an old request
        fetch(`/api/transfer/lookup?account=${account}`, { signal: controller.signal })
            .then(async (response) => ({ response, data: await response.json() }))
            .then(({ response, data }) =>
                setLookup(
                    response.ok
                        ? { forAccount: account, ok: true, name: data.name, masked: data.maskedAccount }
                        : { forAccount: account, ok: false, message: data.error },
                ),
            )
            .catch((err) => {
                if (err.name === "AbortError") return; // we cancelled it ourselves
                setLookup({
                    forAccount: account,
                    ok: false,
                    message: "Could not look up the account. Please try again.",
                });
            });

        return () => controller.abort();
    }, [account]);

    // The lookup only counts if it is for the number currently typed.
    const current = lookup && lookup.forAccount === account ? lookup : null;
    const searching = account.length === 10 && !current;

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");

        // Quick checks for the customer. The server checks everything again.
        if (!current?.ok) return setError("Enter the account number of the person you want to pay.");
        if (!parseAmount(amount)) return setError("Enter an amount above 0 with at most 2 decimals.");
        if (!password) return setError("Enter your password to confirm.");

        setSending(true);
        try {
            const response = await fetch("/api/transfer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ toAccountNumber: account, amount, note, password }),
            });
            const data = await response.json();

            if (response.status === 401) {
                router.replace("/login?session=ended"); // the login expired
                return;
            }
            if (!response.ok) {
                setError(data.error ?? "Something went wrong. Please try again.");
                setPassword("");
                return;
            }

            setSuccess({
                receiverName: data.receiverName,
                amount: data.amount,
                newBalance: data.newBalance,
            });
        } catch {
            setError("Could not reach the server. Check your connection and try again.");
        } finally {
            setSending(false);
        }
    }

    function startAnother() {
        setAccount("");
        setAmount("");
        setNote("");
        setPassword("");
        setLookup(null);
        setError("");
        setSuccess(null);
        router.refresh(); // reload the balance shown at the top of the page
    }

    // ---------- Success screen ----------
    if (success) {
        return (
            <div className="max-w-xl rounded-xl bg-surface px-6 py-10 text-center">
                <CircleCheck size={44} className="mx-auto text-received" />
                <h2 className="mt-4 text-xl font-medium text-ink">Money sent</h2>
                <p role="status" className="mt-2 text-sm text-ink">
                    You sent <strong>{formatMoneyString(success.amount)}</strong> to{" "}
                    <strong>{success.receiverName}</strong>.
                </p>
                <p className="mt-1 text-sm text-muted">
                    Your new balance is {formatMoneyString(success.newBalance)}.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                        type="button"
                        onClick={startAnother}
                        className="rounded-xl bg-ink px-6 py-3 text-sm font-medium text-white"
                    >
                        Send another payment
                    </button>
                    <Link
                        href="/transactions"
                        className="rounded-xl bg-white px-6 py-3 text-sm font-medium text-ink ring-1 ring-black/10"
                    >
                        View transactions
                    </Link>
                </div>
            </div>
        );
    }

    // ---------- The form ----------
    return (
        <form onSubmit={handleSubmit} className="max-w-xl space-y-5 rounded-xl bg-white" noValidate>
            <p className="text-sm text-muted">
                Available balance: <strong className="text-ink">{formatMoneyString(balance)}</strong>
            </p>

            <div>
                <label htmlFor="account" className="text-xs text-muted">
                    Receiver account number
                </label>
                <input
                    id="account"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={10}
                    placeholder="10 digit account number"
                    value={account}
                    // Keep digits only, so letters and spaces are ignored while typing.
                    onChange={(e) => setAccount(e.target.value.replace(/\D/g, ""))}
                    className={inputClass}
                />
                {/* Result of the live lookup: the receiver's name only */}
                <div aria-live="polite" className="mt-2 min-h-5 text-sm">
                    {searching && <span className="text-muted">Looking up account...</span>}
                    {current?.ok && (
                        <span className="text-ink">
                            Sending to <strong>{current.name}</strong>{" "}
                            <span className="text-muted">({current.masked})</span>
                        </span>
                    )}
                    {current && !current.ok && <span className="text-sent">{current.message}</span>}
                </div>
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

            <div>
                <label htmlFor="password" className="text-xs text-muted">
                    Confirm with your password
                </label>
                <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                />
            </div>

            {/* role="alert" makes screen readers announce the error */}
            {error && (
                <p role="alert" className="rounded-xl bg-pastel-orange/30 px-4 py-3 text-sm text-sent">
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={sending}
                className="w-full rounded-xl bg-ink py-3 text-sm font-medium text-white disabled:opacity-60"
            >
                {sending ? "Sending..." : "Send money"}
            </button>
        </form>
    );
}