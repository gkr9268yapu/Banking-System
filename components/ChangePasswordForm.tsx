"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordValidators";

const inputClass =
    "mt-1.5 w-full rounded-xl bg-surface px-4 py-3 text-sm text-ink outline-none ring-1 ring-transparent focus:ring-ink";

// Change password form, used on the Settings page and on My Account.
// idPrefix keeps the input ids unique if two forms were ever on one page.
export default function ChangePasswordForm({ idPrefix = "pw" }: { idPrefix?: string }) {
    const router = useRouter();
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);
    const [saving, setSaving] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setDone(false);

        // Quick checks for the user. The server checks everything again.
        if (!current) return setError("Enter your current password.");
        if (next.length < MIN_PASSWORD_LENGTH) {
            return setError(`The new password must have at least ${MIN_PASSWORD_LENGTH} characters.`);
        }
        if (next !== confirm) return setError("The two new passwords do not match.");

        setSaving(true);
        try {
            const response = await fetch("/api/auth/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword: current, newPassword: next }),
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
            setCurrent("");
            setNext("");
            setConfirm("");
            setDone(true);
        } catch {
            setError("Could not reach the server. Check your connection and try again.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-xl space-y-5" noValidate>
            <div>
                <label htmlFor={`${idPrefix}-current`} className="text-xs text-muted">
                    Current password
                </label>
                <input
                    id={`${idPrefix}-current`}
                    type="password"
                    autoComplete="current-password"
                    maxLength={72}
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    className={inputClass}
                />
            </div>
            <div>
                <label htmlFor={`${idPrefix}-new`} className="text-xs text-muted">
                    New password (at least {MIN_PASSWORD_LENGTH} characters)
                </label>
                <input
                    id={`${idPrefix}-new`}
                    type="password"
                    autoComplete="new-password"
                    maxLength={72}
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    className={inputClass}
                />
            </div>
            <div>
                <label htmlFor={`${idPrefix}-confirm`} className="text-xs text-muted">
                    Repeat the new password
                </label>
                <input
                    id={`${idPrefix}-confirm`}
                    type="password"
                    autoComplete="new-password"
                    maxLength={72}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={inputClass}
                />
            </div>

            {error && (
                <p role="alert" className="rounded-xl bg-pastel-orange/30 px-4 py-3 text-sm text-sent">
                    {error}
                </p>
            )}
            {done && (
                <p role="status" className="rounded-xl bg-chart-blue-panel px-4 py-3 text-sm text-ink">
                    Your password was changed. Use the new one the next time you sign in.
                </p>
            )}

            <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-ink py-3 text-sm font-medium text-white disabled:opacity-60 sm:w-auto sm:px-8"
            >
                {saving ? "Saving..." : "Change password"}
            </button>
        </form>
    );
}