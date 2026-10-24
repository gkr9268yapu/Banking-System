import { ArrowLeftRight, Landmark, Users } from "lucide-react";
import BarChartCard from "@/components/BarChartCard";
import DarkTable from "@/components/DarkTable";
import ListRow, { ListRows } from "@/components/ListRow";
import SectionHeading from "@/components/SectionHeading";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { getAdminDashboardData } from "@/lib/adminDashboard";
import { getInitials, typeLabel } from "@/lib/format";
import { formatMoneyString } from "@/lib/money";

// Cycle through the three pastel colors like the customer dashboard.
const tones = ["blue", "orange", "purple"] as const;

// Reads the database and draws everything on the admin dashboard.
// The page wraps this in <Suspense>, so the skeleton shows while we wait.
export default async function AdminDashboardContent() {
    const data = await getAdminDashboardData();

    return (
        <>
            {/* Three stat cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
                <StatCard
                    label="Total customers"
                    value={String(data.totalCustomers)}
                    hint={`${data.activeCustomers} active`}
                    icon={Users}
                    tone="blue"
                />
                <StatCard
                    label="Money held in the bank"
                    value={formatMoneyString(data.totalMoney)}
                    icon={Landmark}
                    tone="purple"
                />
                <StatCard
                    label="Transactions today"
                    value={String(data.transactionsToday)}
                    icon={ArrowLeftRight}
                    tone="orange"
                />
            </div>

            {/* Two charts: number of transactions and total volume, last 7 days */}
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
                <BarChartCard
                    title="Transactions per day"
                    tone="blue"
                    valueType="count"
                    data={data.days.map((day) => ({ label: day.label, value: day.count }))}
                />
                <BarChartCard
                    title="Volume per day"
                    tone="purple"
                    data={data.days.map((day) => ({ label: day.label, value: day.volume }))}
                />
            </div>

            {/* Lower section: recent transactions (left), customers (right) */}
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
                <section className="min-w-0">
                    <SectionHeading>Recent transactions</SectionHeading>
                    <div className="mt-6">
                        {data.recent.length === 0 ? (
                            <p className="rounded-xl bg-surface px-5 py-8 text-center text-sm text-muted">
                                No transactions yet.
                            </p>
                        ) : (
                            <ListRows>
                                {data.recent.map((txn, index) => (
                                    <ListRow
                                        key={txn.id}
                                        icon={getInitials(txn.from)}
                                        tone={tones[index % 3]}
                                        title={`${txn.from} → ${txn.to}`}
                                        wrapTitle
                                        subtitle={typeLabel(txn.type)}
                                        value={formatMoneyString(txn.amount)}
                                        valueLabel="Amount"
                                        rightValue={txn.time}
                                        rightLabel={txn.date}
                                    />
                                ))}
                            </ListRows>
                        )}
                    </div>
                </section>

                <section className="min-w-0">
                    <SectionHeading>Customers</SectionHeading>
                    <div className="mt-6">
                        <DarkTable
                            columns={[
                                { key: "name", label: "Name" },
                                { key: "balance", label: "Balance" },
                                { key: "status", label: "Status" },
                            ]}
                            rows={data.customers.map((customer) => ({
                                name: customer.name,
                                balance: customer.balance ? formatMoneyString(customer.balance) : "-",
                                status: <StatusBadge status={customer.status} />,
                            }))}
                            emptyMessage="No customers yet."
                        />
                    </div>
                </section>
            </div>
        </>
    );
}