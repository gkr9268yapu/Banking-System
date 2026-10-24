"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";

const inputClass =
    "mt-1.5 w-full rounded-xl bg-surface px-4 py-3 text-sm text-ink outline-none ring-1 ring-transparent focus:ring-ink";

type Created = { userId: number; accountNumber: string; name: string };

// The "Create customer" form. The server creates the user, the account
// (balance 0.00, new 10 digit number) and the QR token in one transaction.
export default function CreateCustomerForm() {
    const router = useRouter();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [sending, setSending] = useState(false);
    const [created, setCreated] = useState<Created | null>(null);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");

        // Quick checks. The server checks everything again.
        if (fullName.trim().length < 2) return setError("Enter the customer's full name.");
        if (!email.trim()) return setError("Enter the customer's email.");
        if (password.length < 8) return setError("The password must be at least 8 characters.");

        setSending(true);
        try {
            const response = await fetch("/api/admin/customers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName, email, phone, password }),
            });
            const data = await response.json();

            if (response.status === 401) {
                router.replace("/login?session=ended");
                return;
            }
            if (!response.ok) {
                setError(data.error ?? "Something went wrong. Please try again.");
                return;
            }
            setCreated({ userId: data.userId, accountNumber: data.accountNumber, name: fullName.trim() });
            setPassword(""); // do not keep the password in the page
        } catch {
            setError("Could not reach the server. Check your connection and try again.");
        } finally {
            setSending(false);
        }
    }

    function createAnother() {
        setFullName("");
        setEmail("");
        setPhone("");
        setPassword("");
        setError("");
        setCreated(null);
    }

    if (created) {
        return (
            <div className="max-w-xl rounded-xl bg-surface px-6 py-10 text-center">
                <CircleCheck size={44} className="mx-auto text-received" />
                <h2 className="mt-4 text-xl font-medium text-ink">Customer created</h2>
                <p role="status" className="mt-2 text-sm text-ink">
                    <strong>{created.name}</strong> can now log in. Account number{" "}
                    <strong>{created.accountNumber}</strong>, balance $0.00.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link
                        href={`/admin/customers/${created.userId}`}
                        className="rounded-xl bg-ink px-6 py-3 text-sm font-medium text-white"
                    >
                        View customer
                    </Link>
                    <button
                        type="button"
                        onClick={createAnother}
                        className="rounded-xl bg-white px-6 py-3 text-sm font-medium text-ink ring-1 ring-black/10"
                    >
                        Create another
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="max-w-xl space-y-5">
            <div>
                <label htmlFor="fullName" className="text-xs text-muted">
                    Full name
                </label>
                <input
                    id="fullName"
                    type="text"
                    maxLength={100}
                    autoComplete="off"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClass}
                />
            </div>
            <div>
                <label htmlFor="email" className="text-xs text-muted">
                    Email
                </label>
                <input
                    id="email"
                    type="email"
                    maxLength={100}
                    autoComplete="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                />
            </div>
            <div>
                <label htmlFor="phone" className="text-xs text-muted">
                    Phone (optional)
                </label>
                <input
                    id="phone"
                    type="tel"
                    maxLength={20}
                    autoComplete="off"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                />
            </div>
            <div>
                <label htmlFor="password" className="text-xs text-muted">
                    Starting password (at least 8 characters)
                </label>
                <input
                    id="password"
                    type="password"
                    maxLength={72}
                    autoComplete="new-password"
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

            <button
                type="submit"
                disabled={sending}
                className="w-full rounded-xl bg-ink py-3 text-sm font-medium text-white disabled:opacity-60"
            >
                {sending ? "Creating..." : "Create customer"}
            </button>
        </form>
    );
}