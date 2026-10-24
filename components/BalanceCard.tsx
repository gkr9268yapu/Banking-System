"use client";

import { useState } from "react";
import { Eye, EyeOff, Wallet } from "lucide-react";
import StatCard from "@/components/StatCard";
import { CURRENCY_SYMBOL } from "@/lib/config";
import { formatMoneyString } from "@/lib/money";

type BalanceCardProps = {
    balance: string; // DECIMAL as text, for example "5000.00"
    accountNumber?: string | null;
};

// The balance stat card with an eye button that hides or shows the amount.
// This is only for privacy on screen (someone looking over your shoulder).
export default function BalanceCard({ balance, accountNumber }: BalanceCardProps) {
    const [hidden, setHidden] = useState(false);

    return (
        <StatCard
            label="Current balance"
            value={hidden ? `${CURRENCY_SYMBOL}••••••` : formatMoneyString(balance)}
            hint={accountNumber ? `Account ${accountNumber}` : undefined}
            icon={Wallet}
            tone="blue"
            action={
                <button
                    type="button"
                    onClick={() => setHidden(!hidden)}
                    aria-label={hidden ? "Show balance" : "Hide balance"}
                    aria-pressed={hidden}
                    className="rounded-full p-2 text-muted hover:text-ink"
                >
                    {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            }
        />
    );
}