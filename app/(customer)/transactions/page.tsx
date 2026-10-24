import Link from "next/link";
import ListRow, { ListRows } from "@/components/ListRow";
import PageShell from "@/components/PageShell";
import { requireUser } from "@/lib/auth";
import { getInitials } from "@/lib/format";
import { formatMoneyString } from "@/lib/money";
import {
    getTransactions,
    parseFilters,
    type Filters,
    type Tab,
} from "@/lib/transactions";

const tones = ["blue", "orange", "purple"] as const;

const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "sent", label: "Sent" },
    { key: "received", label: "Received" },
];

const typeLabels: Record<string, string> = {
    TRANSFER: "Transfer",
    QR_PAY: "QR payment",
    DEPOSIT: "Deposit",
    WITHDRAW: "Withdrawal",
};

// Builds a link such as /transactions?tab=sent&from=2026-10-01&page=2.
// The filters live in the address bar, so the page can be refreshed or shared.
function buildHref(filters: Filters, changes: Partial<Filters>): string {
    const next = { ...filters, ...changes };
    const query = new URLSearchParams();
    if (next.tab !== "all") query.set("tab", next.tab);
    if (next.from) query.set("from", next.from);
    if (next.to) query.set("to", next.to);
    if (next.page > 1) query.set("page", String(next.page));
    const text = query.toString();
    return text ? `/transactions?${text}` : "/transactions";
}

const pillClass = "rounded-xl px-5 py-2 text-sm font-medium";
const dateClass =
    "mt-1.5 w-full rounded-xl bg-surface px-4 py-2.5 text-sm text-ink outline-none ring-1 ring-transparent focus:ring-ink";

export default async function TransactionsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    // Check on the server, in the page itself, that this is an ACTIVE customer.
    const user = await requireUser("CUSTOMER");

    // Read the filters from the address bar. Wrong values show a message
    // and the page falls back to "All, no dates, page 1".
    const parsed = parseFilters(await searchParams);
    const filters: Filters = parsed.ok
        ? parsed.value
        : { tab: "all", from: null, to: null, page: 1 };

    // The account comes from the session, never from the browser.
    const result =
        user.accountId === null ? null : await getTransactions(user.accountId, filters);

    return (
        <PageShell title="Transactions" userName={user.fullName} role="customer">
            {!result ? (
                <p className="rounded-xl bg-surface px-5 py-8 text-center text-sm text-muted">
                    We could not find your account. Please contact the bank.
                </p>
            ) : (
                <div className="space-y-6">
                    {/* Filter tabs: All / Sent / Received (the dates are kept) */}
                    <div className="flex gap-2" role="tablist" aria-label="Filter transactions">
                        {tabs.map((tab) => {
                            const active = filters.tab === tab.key;
                            return (
                                <Link
                                    key={tab.key}
                                    href={buildHref(filters, { tab: tab.key, page: 1 })}
                                    role="tab"
                                    aria-selected={active}
                                    className={`${pillClass} ${active ? "bg-ink text-white" : "bg-surface text-muted"
                                        }`}
                                >
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Date range: a normal form that reloads the page with ?from=...&to=... */}
                    <form method="get" action="/transactions" className="flex flex-wrap items-end gap-3">
                        {filters.tab !== "all" && <input type="hidden" name="tab" value={filters.tab} />}
                        <div className="min-w-0 flex-1 basis-36">
                            <label htmlFor="from" className="text-xs text-muted">
                                From
                            </label>
                            <input
                                id="from"
                                name="from"
                                type="date"
                                defaultValue={filters.from ?? ""}
                                className={dateClass}
                            />
                        </div>
                        <div className="min-w-0 flex-1 basis-36">
                            <label htmlFor="to" className="text-xs text-muted">
                                To
                            </label>
                            <input
                                id="to"
                                name="to"
                                type="date"
                                defaultValue={filters.to ?? ""}
                                className={dateClass}
                            />
                        </div>
                        <button
                            type="submit"
                            className="rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white"
                        >
                            Apply
                        </button>
                        {(filters.from || filters.to) && (
                            <Link
                                href={buildHref(filters, { from: null, to: null, page: 1 })}
                                className="px-2 py-2.5 text-sm text-muted underline"
                            >
                                Clear dates
                            </Link>
                        )}
                    </form>

                    {!parsed.ok && (
                        <p role="alert" className="rounded-xl bg-pastel-orange/30 px-4 py-3 text-sm text-sent">
                            {parsed.error}
                        </p>
                    )}

                    {/* The list: same rows as the dashboard */}
                    {result.items.length === 0 ? (
                        <p className="rounded-xl bg-surface px-5 py-8 text-center text-sm text-muted">
                            No transactions found.
                        </p>
                    ) : (
                        <ListRows>
                            {result.items.map((txn, index) => {
                                const received = txn.direction === "RECEIVED";
                                return (
                                    <ListRow
                                        key={txn.id}
                                        icon={getInitials(txn.otherParty)}
                                        tone={tones[index % 3]}
                                        title={txn.otherParty}
                                        subtitle={typeLabels[txn.type] ?? txn.type}
                                        // + for money in, - for money out
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

                    {/* Pagination: 10 per page */}
                    {result.total > 0 && (
                        <nav
                            aria-label="Pages"
                            className="flex items-center justify-between gap-3 text-sm text-muted"
                        >
                            {result.page > 1 ? (
                                <Link
                                    href={buildHref(filters, { page: result.page - 1 })}
                                    className="rounded-xl bg-surface px-4 py-2 font-medium text-ink"
                                >
                                    Previous
                                </Link>
                            ) : (
                                <span className="rounded-xl bg-surface px-4 py-2 opacity-50">Previous</span>
                            )}
                            <span>
                                Page {result.page} of {result.pageCount} ({result.total} in total)
                            </span>
                            {result.page < result.pageCount ? (
                                <Link
                                    href={buildHref(filters, { page: result.page + 1 })}
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
            )}
        </PageShell>
    );
}