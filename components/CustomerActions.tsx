"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ACTIONS, actionsFor, type ActionName } from "@/lib/customerActions";

type CustomerActionsProps = {
    userId: number;
    name: string;
    status: string; // the customer's current status
};

// The Block / Unblock / Deactivate / Reactivate / Delete buttons.
// Clicking one does NOT act at once: it asks "Are you sure?" first.
export default function CustomerActions({ userId, name, status }: CustomerActionsProps) {
    const router = useRouter();
    const [pending, setPending] = useState<ActionName | null>(null); // waiting for confirmation
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    async function confirmAction(action: ActionName) {
        setBusy(true);
        setError("");
        try {
            const response = await fetch(`/api/admin/customers/${userId}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            const data = await response.json();

            if (response.status === 401) {
                router.replace("/login?session=ended"); // the login expired
                return;
            }
            if (!response.ok) {
                setError(data.error ?? "Something went wrong. Please try again.");
                setPending(null);
                return;
            }
            setPending(null);
            router.refresh(); // reload the page so the new status shows
        } catch {
            setError("Could not reach the server. Check your connection and try again.");
        } finally {
            setBusy(false);
        }
    }

    const available = actionsFor(status);
    if (available.length === 0) {
        return <span className="text-xs text-muted">No actions</span>;
    }

    // Step 2: the confirmation question
    if (pending) {
        const rule = ACTIONS[pending];
        return (
            <div role="alertdialog" aria-label="Confirm action" className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-ink">
                    {rule.label} <strong>{name}</strong>?
                    {pending === "DELETE_USER" && " They will no longer be able to log in."}
                </span>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => confirmAction(pending)}
                    className={`rounded-full px-3 py-1 text-xs font-medium text-white disabled:opacity-60 ${rule.danger ? "bg-sent" : "bg-ink"
                        }`}
                >
                    {busy ? "Working..." : `Yes, ${rule.verb}`}
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPending(null)}
                    className="rounded-full bg-surface px-3 py-1 text-xs text-ink"
                >
                    Cancel
                </button>
            </div>
        );
    }

    // Step 1: the buttons
    return (
        <div className="flex flex-wrap items-center gap-2">
            {available.map((action) => (
                <button
                    key={action}
                    type="button"
                    onClick={() => {
                        setError("");
                        setPending(action);
                    }}
                    className={`rounded-full bg-surface px-3 py-1 text-xs font-medium ${ACTIONS[action].danger ? "text-sent" : "text-ink"
                        }`}
                >
                    {ACTIONS[action].label}
                </button>
            ))}
            {error && (
                <span role="alert" className="w-full text-xs text-sent">
                    {error}
                </span>
            )}
        </div>
    );
}