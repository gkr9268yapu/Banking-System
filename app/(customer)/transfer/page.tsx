import PageShell from "@/components/PageShell";
import TransferForm from "@/components/TransferForm";
import { getAccountOverview } from "@/lib/account";
import { requireUser } from "@/lib/auth";
import { isValidAccountNumber } from "@/lib/validators";

export default async function TransferPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    // Check on the server, in the page itself, that this is an ACTIVE customer.
    const user = await requireUser("CUSTOMER");

    // The Quick pay "Pay" button opens /transfer?to=1000000002.
    // Only a clean 10 digit number is accepted, anything else is ignored.
    const { to } = await searchParams;
    const initialAccount = typeof to === "string" && isValidAccountNumber(to) ? to : "";

    // The account comes from the session, never from the browser.
    const account =
        user.accountId === null ? null : await getAccountOverview(user.accountId);

    return (
        <PageShell title="Transfer" userName={user.fullName} role="customer">
            {!account ? (
                <p className="rounded-xl bg-surface px-5 py-8 text-center text-sm text-muted">
                    We could not find your account. Please contact the bank.
                </p>
            ) : account.accountStatus !== "ACTIVE" ? (
                <p role="status" className="rounded-xl bg-pastel-orange/30 px-5 py-4 text-sm text-sent">
                    Your account is {account.accountStatus === "FROZEN" ? "frozen" : "closed"}, so you
                    cannot send money right now. Please contact the bank.
                </p>
            ) : (
                <TransferForm initialAccount={initialAccount} balance={account.balance} />
            )}
        </PageShell>
    );
}