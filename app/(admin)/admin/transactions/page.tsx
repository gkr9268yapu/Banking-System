import Link from "next/link";
import ListRow, { ListRows } from "@/components/ListRow";
import PageShell from "@/components/PageShell";
import Pagination from "@/components/Pagination";
import {
    getAdminTransactions,
    parseAdminTxnFilters,
    type AdminTxnFilters,
    type TypeFilter,
} from "@/lib/adminTransactions";
import { requireUser } from "@/lib/auth";
import { getInitials, typeLabel } from "@/lib/format";
import { formatMoneyString } from "@/lib/money";

const tones = ["blue", "orange", "purple"] as const;

const tabs: { key: TypeFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "transfer", label: "Transfers" },
    { key: "qr_pay", label: "QR payments" },
    { key: "deposit", label: "Deposits" },
    { key: "withdraw", label: "Withdrawals" },
];

// Builds a link such as /admin/transactions?type=deposit&from=2026-10-01&page=2.
// The filters live in the address bar, so the page can be refreshed or shared.
function buildHref(filters: AdminTxnFilters, changes: Partial<AdminTxnFilters>): string {
    const next = { ...filters, ...changes };
    const query = new URLSearchParams();
    if (next.type !== "all") query.set("type", next.type);
    if (next.q) query.set("q", next.q);
    if (next.from) query.set("from", next.from);
    if (next.to) query.set("to", next.to);
    if (next.page > 1) query.set("page", String(next.page));
    const text = query.toString();
    return text ? `/admin/transactions?${text}` : "/admin/transactions";
}

const fieldClass =
    "mt-1.5 w-full rounded-xl bg-surface px-4 py-2.5 text-sm text-ink outline-none ring-1 ring-transparent focus:ring-ink";

export default async function AdminTransactionsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    // Check on the server, in the page itself, that this is an ACTIVE admin.
    const user = await requireUser("ADMIN");

    // Wrong values show a message and the page falls back to "All, no filters, page 1".
    const parsed = parseAdminTxnFilters(await searchParams);
    const filters: AdminTxnFilters = parsed.ok
        ? parsed.value
        : { type: "all", q: "", from: null, to: null, page: 1 };
    const result = await getAdminTransactions(filters);
    const hasFilters = Boolean(filters.q || filters.from || filters.to);

    return (
        <PageShell title="Transactions" userName={user.fullName} role="admin">
            <div className="space-y-6">
                {/* Type tabs (the search and dates are kept) */}
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by type">
                    {tabs.map((tab) => {
                        const active = filters.type === tab.key;
                        return (
                            <Link
                                key={tab.key}
                                href={buildHref(filters, { type: tab.key, page: 1 })}
                                role="tab"
                                aria-selected={active}
                                className={`rounded-xl px-5 py-2 text-sm font-medium ${active ? "bg-ink text-white" : "bg-surface text-muted"
                                    }`}
                            >
                                {tab.label}
                            </Link>
                        );
                    })}
                </div>

                {/* Customer search and date range: a normal form that reloads the page */}
                <form method="get" action="/admin/transactions" className="flex flex-wrap items-end gap-3">
                    {filters.type !== "all" && <input type="hidden" name="type" value={filters.type} />}
                    <div className="min-w-0 flex-[2] basis-56">
                        <label htmlFor="q" className="text-xs text-muted">
                            Customer name or account number
                        </label>
                        <input
                            id="q"
                            name="q"
                            type="search"
                            maxLength={100}
                            defaultValue={filters.q}
                            className={fieldClass}
                        />
                    </div>
                    <div className="min-w-0 flex-1 basis-36">
                        <label htmlFor="from" className="text-xs text-muted">
                            From
                        </label>
                        <input id="from" name="from" type="date" defaultValue={filters.from ?? ""} className={fieldClass} />
                    </div>
                    <div className="min-w-0 flex-1 basis-36">
                        <label htmlFor="to" className="text-xs text-muted">
                            To
                        </label>
                        <input id="to" name="to" type="date" defaultValue={filters.to ?? ""} className={fieldClass} />
                    </div>
                    <button
                        type="submit"
                        className="rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white"
                    >
                        Apply
                    </button>
                    {hasFilters && (
                        <Link
                            href={buildHref(filters, { q: "", from: null, to: null, page: 1 })}
                            className="px-2 py-2.5 text-sm text-muted underline"
                        >
                            Clear
                        </Link>
                    )}
                </form>

                {!parsed.ok && (
                    <p role="alert" className="rounded-xl bg-pastel-orange/30 px-4 py-3 text-sm text-sent">
                        {parsed.error}
                    </p>
                )}

                {result.items.length === 0 ? (
                    <p className="rounded-xl bg-surface px-5 py-8 text-center text-sm text-muted">
                        No transactions found.
                    </p>
                ) : (
                    <ListRows>
                        {result.items.map((txn, index) => (
                            <ListRow
                                key={txn.id}
                                icon={getInitials(txn.from)}
                                tone={tones[index % 3]}
                                title={`${txn.from} → ${txn.to}`}
                                wrapTitle
                                subtitle={txn.note ? `${typeLabel(txn.type)} · ${txn.note}` : typeLabel(txn.type)}
                                value={formatMoneyString(txn.amount)}
                                valueLabel={txn.status === "SUCCESS" ? "Success" : "Failed"}
                                rightValue={txn.time}
                                rightLabel={txn.date}
                            />
                        ))}
                    </ListRows>
                )}

                {result.total > 0 && (
                    <Pagination
                        page={result.page}
                        pageCount={result.pageCount}
                        total={result.total}
                        prevHref={buildHref(filters, { page: result.page - 1 })}
                        nextHref={buildHref(filters, { page: result.page + 1 })}
                    />
                )}
            </div>
        </PageShell>
    );
}