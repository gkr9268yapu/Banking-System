import Link from "next/link";
import { notFound } from "next/navigation";
import CustomerActions from "@/components/CustomerActions";
import DetailList from "@/components/DetailList";
import ListRow, { ListRows } from "@/components/ListRow";
import PageShell from "@/components/PageShell";
import SectionHeading from "@/components/SectionHeading";
import StatusBadge from "@/components/StatusBadge";
import { getCustomerDetail } from "@/lib/adminCustomers";
import { requireUser } from "@/lib/auth";
import { getInitials, typeLabel } from "@/lib/format";
import { formatMoneyString } from "@/lib/money";
import { getTransactions, parseFilters } from "@/lib/transactions";

const tones = ["blue", "orange", "purple"] as const;

export default async function AdminCustomerDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    // Check on the server, in the page itself, that this is an ACTIVE admin.
    const user = await requireUser("ADMIN");

    // The id in the address must be plain digits and belong to a customer.
    const { id } = await params;
    if (!/^\d{1,10}$/.test(id)) notFound();
    const customer = await getCustomerDetail(Number(id));
    if (!customer) notFound();

    // This customer's transactions, 10 per page (?page=2).
    const parsed = parseFilters({ page: (await searchParams).page });
    const page = parsed.ok ? parsed.value.page : 1;
    const history =
        customer.accountId === null
            ? null
            : await getTransactions(customer.accountId, { tab: "all", from: null, to: null, page });

    return (
        <PageShell title={customer.fullName} userName={user.fullName} role="admin">
            <Link href="/admin/customers" className="text-sm text-muted underline">
                Back to customers
            </Link>

            <section>
                <SectionHeading>Profile</SectionHeading>
                <div className="mt-6 max-w-2xl">
                    <DetailList
                        items={[
                            { label: "Full name", value: customer.fullName },
                            { label: "Email", value: customer.email },
                            { label: "Phone", value: customer.phone ?? "Not provided" },
                            { label: "Customer since", value: customer.memberSince },
                            { label: "Status", value: <StatusBadge status={customer.status} /> },
                            { label: "Account number", value: customer.accountNumber ?? "No account" },
                            { label: "Account status", value: customer.accountStatus ?? "-" },
                            {
                                label: "Balance",
                                value: customer.balance ? formatMoneyString(customer.balance) : "-",
                            },
                        ]}
                    />
                </div>
            </section>

            <section>
                <SectionHeading>Actions</SectionHeading>
                <div className="mt-6">
                    <CustomerActions
                        userId={customer.userId}
                        name={customer.fullName}
                        status={customer.status}
                    />
                </div>
            </section>

            <section>
                <SectionHeading>Transactions</SectionHeading>
                <div className="mt-6 space-y-6">
                    {!history || history.items.length === 0 ? (
                        <p className="rounded-xl bg-surface px-5 py-8 text-center text-sm text-muted">
                            No transactions yet.
                        </p>
                    ) : (
                        <ListRows>
                            {history.items.map((txn, index) => {
                                const received = txn.direction === "RECEIVED";
                                return (
                                    <ListRow
                                        key={txn.id}
                                        icon={getInitials(txn.otherParty)}
                                        tone={tones[index % 3]}
                                        title={txn.otherParty}
                                        subtitle={typeLabel(txn.type)}
                                        value={formatMoneyString(received ? txn.amount : `-${txn.amount}`, {
                                            showPlus: true,
                                        })}
                                        valueLabel={txn.status === "SUCCESS" ? "Success" : "Failed"}
                                        rightValue={received ? "Received" : "Sent"}
                                        rightLabel={txn.date}
                                        rightClassName={received ? "text-received" : "text-sent"}
                                    />
                                );
                            })}
                        </ListRows>
                    )}

                    {history && history.pageCount > 1 && (
                        <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-sm text-muted">
                            {history.page > 1 ? (
                                <Link
                                    href={`/admin/customers/${customer.userId}?page=${history.page - 1}`}
                                    className="rounded-xl bg-surface px-4 py-2 font-medium text-ink"
                                >
                                    Previous
                                </Link>
                            ) : (
                                <span className="rounded-xl bg-surface px-4 py-2 opacity-50">Previous</span>
                            )}
                            <span>
                                Page {history.page} of {history.pageCount} ({history.total} in total)
                            </span>
                            {history.page < history.pageCount ? (
                                <Link
                                    href={`/admin/customers/${customer.userId}?page=${history.page + 1}`}
                                    className="rounded-xl bg-surface px-4 py-2 font-medium text-ink"
                                >
                                    Next
                                </Link>
                            ) : (
                                <span className="rounded-xl bg-surface px-4 py-2 opacity-50">Next</span>
                            )}
                        </nav>
                    )}
                </div>
            </section>
        </PageShell>
    );
}