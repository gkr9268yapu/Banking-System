"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import QrScanner from "@/components/QrScanner";
import { CURRENCY_SYMBOL } from "@/lib/config";
import { formatMoneyString, parseAmount } from "@/lib/money";

type QrScanPayProps = { balance: string };

type Receiver = { payload: string; name: string; masked: string };
type Success = { receiverName: string; amount: string; newBalance: string };

const inputClass =
    "mt-1.5 w-full rounded-xl bg-surface px-4 py-3 text-sm text-ink outline-none ring-1 ring-transparent focus:ring-ink";

// "Scan" tab. Steps: 1 scan the QR, 2 the server says who owns it,
// 3 the payer enters amount and password, 4 the server moves the money.
export default function QrScanPay({ balance }: QrScanPayProps) {
    const router = useRouter();
    const [receiver, setReceiver] = useState<Receiver | null>(null);
    const [looking, setLooking] = useState(false);
    const [scanKey, setScanKey] = useState(0); // a new key restarts the scanner
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState<Success | null>(null);
    const [shownBalance, setShownBalance] = useState(balance);

    // Step 2: ask the server who owns the scanned QR.
    async function handleScan(text: string) {
        setLooking(true);
        setError("");
        try {
            const response = await fetch("/api/qr/resolve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payload: text }),
            });
            const data = await response.json();
            if (response.status === 401) {
                router.replace("/login?session=ended");
                return;
            }
            if (!response.ok) {
                setError(data.error ?? "Could not read the QR code.");
                return;
            }
            setReceiver({ payload: text, name: data.name, masked: data.maskedAccount });
        } catch {
            setError("Could not reach the server. Check your connection and try again.");
        } finally {
            setLooking(false);
        }
    }

    function scanAgain() {
        setReceiver(null);
        setAmount("");
        setNote("");
        setPassword("");
        setError("");
        setSuccess(null);
        setScanKey((key) => key + 1);
    }

    // Step 4: send the payment.
    async function handlePay(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        if (!receiver) return;

        // Quick checks for the customer. The server checks everything again.
        if (!parseAmount(amount)) return setError("Enter an amount above 0 with at most 2 decimals.");
        if (!password) return setError("Enter your password to confirm.");

        setSending(true);
        try {
            const response = await fetch("/api/qr/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payload: receiver.payload, amount, note, password }),
            });
            const data = await response.json();

            if (response.status === 401) {
                router.replace("/login?session=ended");
                return;
            }
            if (!response.ok) {
                setError(data.error ?? "Something went wrong. Please try again.");
                setPassword("");
                return;
            }
            setShownBalance(data.newBalance);
            setSuccess({
                receiverName: data.receiverName,
                amount: data.amount,
                newBalance: data.newBalance,
            });
            router.refresh(); // reload the balance on other parts of the app
        } catch {
            setError("Could not reach the server. Check your connection and try again.");
        } finally {
            setSending(false);
        }
    }

    // ---------- Success ----------
    if (success) {
        return (
            <div className="max-w-xl rounded-xl bg-surface px-6 py-10 text-center">
                <CircleCheck size={44} className="mx-auto text-received" />
                <h2 className="mt-4 text-xl font-medium text-ink">Payment sent</h2>
                <p role="status" className="mt-2 text-sm text-ink">
                    You paid <strong>{formatMoneyString(success.amount)}</strong> to{" "}
                    <strong>{success.receiverName}</strong>.
                </p>
                <p className="mt-1 text-sm text-muted">
                    Your new balance is {formatMoneyString(success.newBalance)}.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                        type="button"
                        onClick={scanAgain}
                        className="rounded-xl bg-ink px-6 py-3 text-sm font-medium text-white"
                    >
                        Scan another code
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

    // ---------- Step 3: confirm and pay ----------
    if (receiver) {
        return (
            <form onSubmit={handlePay} className="max-w-xl space-y-5" noValidate>
                <div className="rounded-xl bg-surface px-5 py-4">
                    <p className="text-xs text-muted">Paying</p>
                    <p className="text-base font-medium text-ink">{receiver.name}</p>
                    <p className="text-sm text-muted">Account {receiver.masked}</p>
                </div>
                <p className="text-sm text-muted">
                    Available balance: <strong className="text-ink">{formatMoneyString(shownBalance)}</strong>
                </p>

                <div>
                    <label htmlFor="qr-amount" className="text-xs text-muted">
                        Amount
                    </label>
                    <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-[calc(50%+3px)] -translate-y-1/2 text-sm text-muted">
                            {CURRENCY_SYMBOL}
                        </span>
                        <input
                            id="qr-amount"
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
                    <label htmlFor="qr-note" className="text-xs text-muted">
                        Note (optional)
                    </label>
                    <input
                        id="qr-note"
                        type="text"
                        maxLength={255}
                        autoComplete="off"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className={inputClass}
                    />
                </div>

                <div>
                    <label htmlFor="qr-password" className="text-xs text-muted">
                        Confirm with your password
                    </label>
                    <input
                        id="qr-password"
                        type="password"
                        autoComplete="current-password"
                        maxLength={72}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputClass}
                    />
                </div>

                {error && (
                    <p role="alert" className="rounded-xl bg-pastel-orange/30 px-4 py-3 text-sm text-sent">
                        {error}
                    </p>
                )}

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={scanAgain}
                        className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-ink ring-1 ring-black/10"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={sending}
                        className="flex-1 rounded-xl bg-ink py-3 text-sm font-medium text-white disabled:opacity-60"
                    >
                        {sending ? "Paying..." : "Pay"}
                    </button>
                </div>
            </form>
        );
    }

    // ---------- Step 1: scanning ----------
    return (
        <div className="max-w-xl space-y-4">
            {looking ? (
                <p className="text-sm text-muted">Reading the QR code...</p>
            ) : error ? (
                <div className="space-y-3">
                    <p role="alert" className="rounded-xl bg-pastel-orange/30 px-4 py-3 text-sm text-sent">
                        {error}
                    </p>
                    <button
                        type="button"
                        onClick={scanAgain}
                        className="rounded-xl bg-ink px-6 py-3 text-sm font-medium text-white"
                    >
                        Scan again
                    </button>
                </div>
            ) : (
                <QrScanner key={scanKey} onScan={handleScan} />
            )}
        </div>
    );
}