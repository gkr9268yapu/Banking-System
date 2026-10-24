import PageShell from "@/components/PageShell";
import QrPayTabs from "@/components/QrPayTabs";
import { getAccountOverview } from "@/lib/account";
import { requireUser } from "@/lib/auth";

export default async function QrPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    // Check on the server, in the page itself, that this is an ACTIVE customer.
    const user = await requireUser("CUSTOMER");

    // The Scan button on the dashboard opens /qr?tab=scan.
    const { tab } = await searchParams;
    const initialTab = tab === "scan" ? "scan" : "my";

    // The account comes from the session, never from the browser.
    const account = user.accountId === null ? null : await getAccountOverview(user.accountId);

    return (
        <PageShell title="QR Pay" userName={user.fullName} role="customer">
            {!account ? (
                <p className="rounded-xl bg-surface px-5 py-8 text-center text-sm text-muted">
                    We could not find your account. Please contact the bank.
                </p>
            ) : (
                <QrPayTabs initialTab={initialTab} balance={account.balance} />
            )}
        </PageShell>
    );
}