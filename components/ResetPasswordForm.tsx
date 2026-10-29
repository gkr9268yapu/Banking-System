"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordValidators";

const inputClass =
    "mt-1.5 w-full rounded-xl bg-surface px-4 py-3 text-sm text-ink outline-none ring-1 ring-transparent focus:ring-ink";

type ResetPasswordFormProps = {
    userId: number;
    name: string; // customer's name, used in the messages
};

// Form on the customer detail page: the admin sets a new password for the customer.
// Step 1 shows the form. Step 2 asks "Are you sure?". Step 3 sends it.
export default function ResetPasswordForm({ userId, name }: ResetPasswordFormProps) {
    const router = useRouter();
    const [newPassword, setNewPassword] = useState("");
    const [repeat, setRepeat] = useState("");
    const [adminPassword, setAdminPassword] = useState("");
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);
    const [saving, setSaving] = useState(false);

    // Step 1 -> 2: quick checks, then ask for confirmation. The server checks again.
    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setDone(false);
        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            return setError(`The new password must have at least ${MIN_PASSWORD_LENGTH} characters.`);
        }
        if (newPassword !== repeat) return setError("The two new passwords do not match.");
        if (!adminPassword) return setError("Enter your own admin password to confirm.");
        setConfirming(true);
    }

    // Step 3: send it.
    async function handleConfirm() {
        setSaving(true);
        setError("");
        try {
            const response = await fetch(`/api/admin/customers/${userId}/password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newPassword, adminPassword }),
            });
            const data = await response.json();

            if (response.status === 401) {
                router.replace("/login?session=ended");
                return;
            }
            setConfirming(false);
            if (!response.ok) {
                setError(data.error ?? "Something went wrong. Please try again.");
                setAdminPassword("");
                return;
            }
            // Clear everything so the new password does not stay in the page.
            setNewPassword("");
            setRepeat("");
            setAdminPassword("");
            setDone(true);
            router.refresh(); // the audit log has a new row
        } catch {
            setConfirming(false);
            setError("Could not reach the server. Check your connection and try again.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-xl space-y-5" noValidate>
            <p className="text-sm text-muted">
                Set a new password for {name}. Tell the customer the new password in person or by phone,
                and ask them to change it in Settings.
            </p>

            <div>
                <label htmlFor="reset-new" className="text-xs text-muted">
                    New password for the customer (at least {MIN_PASSWORD_LENGTH} characters)
                </label>
                <input
                    id="reset-new"
                    type="password"
                    autoComplete="new-password"
                    maxLength={72}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={confirming}
                    className={inputClass}
                />
            </div>
            <div>
                <label htmlFor="reset-repeat" className="text-xs text-muted">
                    Repeat the new password
                </label>
                <input
                    id="reset-repeat"
                    type="password"
                    autoComplete="new-password"
                    maxLength={72}
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value)}
                    disabled={confirming}
                    className={inputClass}
                />
            </div>
            <div>
                <label htmlFor="reset-admin" className="text-xs text-muted">
                    Your own admin password (to confirm it is you)
                </label>
                <input
                    id="reset-admin"
                    type="password"
                    autoComplete="current-password"
                    maxLength={72}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    disabled={confirming}
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
                    The password of {name} was changed.
                </p>
            )}

            {confirming ? (
                <div role="alertdialog" aria-label="Confirm password change" className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-ink">Change the password of {name}?</span>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={saving}
                        className="rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                    >
                        {saving ? "Saving..." : "Yes, change it"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfirming(false)}
                        disabled={saving}
                        className="rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-ink ring-1 ring-black/10"
                    >
                        Cancel
                    </button>
                </div>
            ) : (
                <button
                    type="submit"
                    className="w-full rounded-xl bg-ink py-3 text-sm font-medium text-white sm:w-auto sm:px-8"
                >
                    Change password
                </button>
            )}
        </form>
    );
}