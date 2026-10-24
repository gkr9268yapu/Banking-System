import Link from "next/link";
import { Plus } from "lucide-react";
import CustomerActions from "@/components/CustomerActions";
import PageShell from "@/components/PageShell";
import StatusBadge from "@/components/StatusBadge";
import {
    listCustomers,
    parseCustomerFilters,
    type CustomerFilters,
    type StatusFilter,
} from "@/lib/adminCustomers";
import { requireUser } from "@/lib/auth";
import { formatMoneyString } from "@/lib/money";

const tabs: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "blocked", label: "Blocked" },
    { key: "deactivated", label: "Deactivated" },
    { key: "deleted", label: "Deleted" },
];

// Builds a link such as /admin/customers?status=blocked&q=ayesha.
// The filters live in the address bar, so the page can be refreshed or shared.
function buildHref(filters: CustomerFilters, changes: Partial<CustomerFilters>): string {
    const next = { ...filters, ...changes };
    const query = new URLSearchParams();
    if (next.status !== "all") query.set("status", next.status);
    if (next.q) query.set("q", next.q);
    const text = query.toString();
    return text ? `/admin/customers?${text}` : "/admin/customers";
}

export default async function AdminCustomersPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    // Check on the server, in the page itself, that this is an ACTIVE admin.
    const user = await requireUser("ADMIN");

    const filters = parseCustomerFilters(await searchParams);
    const customers = await listCustomers(filters);

    return (
        <PageShell title="Customers" userName={user.fullName} role="admin">
            <div className="space-y-6">
                {/* Search box and the Create button */}
                <div className="flex flex-wrap items-end gap-3">
                    <form method="get" action="/admin/customers" className="flex min-w-0 flex-1 basis-64 gap-3">
                        {filters.status !== "all" && (
                            <input type="hidden" name="status" value={filters.status} />
                        )}
                        <div className="min-w-0 flex-1">
                            <label htmlFor="q" className="text-xs text-muted">
                                Search by name, email or account number
                            </label>
                            <input
                                id="q"
                                name="q"
                                type="search"
                                maxLength={100}
                                defaultValue={filters.q}
                                className="mt-1.5 w-full rounded-xl bg-surface px-4 py-2.5 text-sm text-ink outline-none ring-1 ring-transparent focus:ring-ink"
                            />
                        </div>
                        <button
                            type="submit"
                            className="self-end rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white"
                        >
                            Search
                        </button>
                    </form>
                    <Link
                        href="/admin/customers/new"
                        className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-ink ring-1 ring-black/10"
                    >
                        <Plus size={16} />
                        Create customer
                    </Link>
                </div>

                {/* Status filter tabs (the search text is kept) */}
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
                    {tabs.map((tab) => {
                        const active = filters.status === tab.key;
                        return (
                            <Link
                                key={tab.key}
                                href={buildHref(filters, { status: tab.key })}
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

                {customers.length === 0 ? (
                    <p className="rounded-xl bg-surface px-5 py-8 text-center text-sm text-muted">
                        No customers found.
                    </p>
                ) : (
                    // On a phone the table scrolls sideways inside this box, not the page.
                    <div className="overflow-x-auto">
                        <p className="mb-3 text-xs text-muted md:hidden">
                            Swipe sideways to see the balance, status and actions.
                        </p>
                        <table className="w-full min-w-[860px] text-sm">
                            <thead>
                                <tr className="text-left text-xs text-muted">
                                    <th className="px-5 pb-3 font-normal">Name</th>
                                    <th className="pb-3 pr-4 font-normal">Email</th>
                                    <th className="pb-3 pr-4 font-normal">Account number</th>
                                    <th className="pb-3 pr-4 text-right font-normal">Balance</th>
                                    <th className="pb-3 pl-4 font-normal">Status</th>
                                    <th className="pb-3 pr-5 font-normal">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map((customer) => (
                                    <tr key={customer.userId} className="align-middle even:bg-surface">
                                        <td className="px-5 py-3 font-bold text-ink">{customer.fullName}</td>
                                        <td className="py-3 pr-4 text-muted">{customer.email}</td>
                                        <td className="py-3 pr-4 text-ink">{customer.accountNumber ?? "-"}</td>
                                        <td className="py-3 pr-4 text-right text-ink">
                                            {customer.balance ? formatMoneyString(customer.balance) : "-"}
                                        </td>
                                        <td className="py-3 pl-4 text-ink">
                                            <StatusBadge status={customer.status} />
                                        </td>
                                        <td className="py-3 pr-5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Link
                                                    href={`/admin/customers/${customer.userId}`}
                                                    className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-white"
                                                >
                                                    View
                                                </Link>
                                                <CustomerActions
                                                    userId={customer.userId}
                                                    name={customer.fullName}
                                                    status={customer.status}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <p className="text-xs text-muted">
                    {customers.length} customer{customers.length === 1 ? "" : "s"} shown
                    {customers.length === 100 ? " (the first 100, use the search to narrow it down)" : ""}
                </p>
            </div>
        </PageShell>
    );
}