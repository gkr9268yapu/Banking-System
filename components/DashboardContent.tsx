import Link from "next/link";
import { ArrowLeftRight, Repeat } from "lucide-react";
import BalanceCard from "@/components/BalanceCard";
import BarChartCard from "@/components/BarChartCard";
import DarkTable from "@/components/DarkTable";
import ListRow, { ListRows } from "@/components/ListRow";
import SectionHeading from "@/components/SectionHeading";
import StatCard from "@/components/StatCard";
import { getDashboardData } from "@/lib/dashboard";
import { getInitials } from "@/lib/format";
import { formatMoneyString, moneySign } from "@/lib/money";

type DashboardContentProps = {
    accountId: number;
    accountNumber: string | null;
};

// Cycle through the three pastel colors like the reference design.
const tones = ["blue", "orange", "purple"] as const;

// Reads the database and draws everything under the quick action buttons.
// The page wraps this in <Suspense>, so the skeleton shows while we wait.
export default async function DashboardContent({
    accountId,
    accountNumber,
}: DashboardContentProps) {
    const data = await getDashboardData(accountId);

    const net = moneySign(data.netThisMonth);
    const netColor =
        net === "positive" ? "text-received" : net === "negative" ? "text-sent" : "text-ink";

    return (
        <>
            {/* Three stat cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
                <BalanceCard balance={data.balance} accountNumber={accountNumber} />
                <StatCard
                    label="Transactions this month"
                    value={String(data.transactionsThisMonth)}
                    icon={ArrowLeftRight}
                    tone="purple"
                />
                <StatCard
                    label="Net this month"
                    value={formatMoneyString(data.netThisMonth, { showPlus: true })}
                    icon={Repeat}
                    tone="orange"
                    valueClassName={netColor}
                />
            </div>

            {/* Two charts side by side on laptop, stacked on phone */}
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
                <BarChartCard
                    title="Money sent"
                    tone="blue"
                    data={data.months.map((month) => ({ label: month.label, value: month.sent }))}
                />
                <BarChartCard
                    title="Money received"
                    tone="purple"
                    data={data.months.map((month) => ({ label: month.label, value: month.received }))}
                />
            </div>

            {/* Lower section: recent transactions on the left, quick pay on the right */}
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
                <section className="min-w-0">
                    <SectionHeading>Recent transactions</SectionHeading>
                    <div className="mt-6">
                        {data.recent.length === 0 ? (
                            <p className="rounded-xl bg-surface px-5 py-8 text-center text-sm text-muted">
                                No transactions yet. Your payments will show up here.
                            </p>
                        ) : (
                            <ListRows>
                                {data.recent.map((txn, index) => {
                                    const received = txn.direction === "RECEIVED";
                                    return (
                                        <ListRow
                                            key={txn.id}
                                            icon={getInitials(txn.otherParty)}
                                            tone={tones[index % 3]}
                                            title={txn.otherParty}
                                            subtitle={txn.type}
                                            value={formatMoneyString(txn.amount)}
                                            valueLabel="Amount"
                                            rightValue={received ? "+ Received" : "- Sent"}
                                            rightLabel={txn.date}
                                            rightClassName={received ? "text-received" : "text-sent"}
                                        />
                                    );
                                })}
                            </ListRows>
                        )}
                    </div>
                </section>

                <section className="min-w-0">
                    <SectionHeading>Quick pay</SectionHeading>
                    <div className="mt-6">
                        <DarkTable
                            columns={[
                                { key: "name", label: "Name" },
                                { key: "account", label: "Account number" },
                                { key: "last", label: "Last amount" },
                                { key: "action", label: "", align: "right" },
                            ]}
                            emptyMessage="No payments yet. People you pay will show up here."
                            rows={data.quickPay.map((person) => ({
                                name: person.name,
                                account: person.accountNumber,
                                last: formatMoneyString(person.lastAmount),
                                action: (
                                    <Link
                                        href={`/transfer?to=${encodeURIComponent(person.accountNumber)}`}
                                        className="rounded-full bg-white/15 px-2.5 py-1 text-xs hover:bg-white/25"
                                    >
                                        Pay
                                    </Link>
                                ),
                            }))}
                        />
                    </div>
                </section>
            </div>
        </>
    );
}