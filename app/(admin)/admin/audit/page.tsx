import DarkTable from "@/components/DarkTable";
import PageShell from "@/components/PageShell";
import Pagination from "@/components/Pagination";
import { getAuditLog, parsePage } from "@/lib/adminAudit";
import { requireUser } from "@/lib/auth";

// "BLOCK_USER" becomes "Block user".
function actionText(action: string): string {
    const text = action.replace(/_/g, " ").toLowerCase();
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export default async function AdminAuditPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    // Check on the server, in the page itself, that this is an ACTIVE admin.
    const user = await requireUser("ADMIN");

    const log = await getAuditLog(parsePage((await searchParams).page));

    return (
        <PageShell title="Audit Log" userName={user.fullName} role="admin">
            <div className="space-y-6">
                <p className="text-xs text-muted md:hidden">Swipe sideways to see all the columns.</p>
                <DarkTable
                    columns={[
                        { key: "when", label: "When" },
                        { key: "admin", label: "Admin" },
                        { key: "action", label: "Action" },
                        { key: "customer", label: "Customer" },
                        { key: "details", label: "Details" },
                    ]}
                    rows={log.items.map((item) => ({
                        when: (
                            <>
                                {item.date}
                                <span className="text-white/60"> · {item.time}</span>
                            </>
                        ),
                        admin: item.admin,
                        action: actionText(item.action),
                        customer: item.target ?? "-",
                        // Details can be long, so this column may use several lines.
                        details: (
                            <span className="inline-block min-w-64 max-w-md whitespace-normal text-white/70">
                                {item.details ?? "-"}
                            </span>
                        ),
                    }))}
                    emptyMessage="No admin actions yet."
                />

                {log.total > 0 && (
                    <Pagination
                        page={log.page}
                        pageCount={log.pageCount}
                        total={log.total}
                        prevHref={`/admin/audit?page=${log.page - 1}`}
                        nextHref={`/admin/audit?page=${log.page + 1}`}
                    />
                )}
            </div>
        </PageShell>
    );
}