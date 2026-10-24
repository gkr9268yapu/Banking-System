import Link from "next/link";
import { CreditCard, ShieldCheck } from "lucide-react";
import BalanceCard from "@/components/BalanceCard";
import CopyAccountNumber from "@/components/CopyAccountNumber";
import DetailList from "@/components/DetailList";
import PageShell from "@/components/PageShell";
import SectionHeading from "@/components/SectionHeading";
import StatCard from "@/components/StatCard";
import { getAccountOverview, type AccountStatus } from "@/lib/account";
import { requireUser } from "@/lib/auth";

const STATUS_TEXT: Record<AccountStatus, string> = {
    ACTIVE: "Active",
    FROZEN: "Frozen",
    CLOSED: "Closed",
};

// Shown only when the account is not active.
const STATUS_NOTICE: Record<Exclude<AccountStatus, "ACTIVE">, string> = {
    FROZEN: "Your account is frozen, so you can't send money right now. Please contact the bank.",
    CLOSED: "Your account is closed. Please contact the bank.",
};

export default async function AccountPage() {
    // Check on the server, in the page itself, that this is an ACTIVE customer.
    const user = await requireUser("CUSTOMER");

    // The account id comes from the session, never from the browser.
    const account =
        user.accountId === null ? null : await getAccountOverview(user.accountId);

    return (
        <PageShell title="My Account" userName={user.fullName} role="customer">
            {!account ? (
                <p className="rounded-xl bg-surface px-5 py-8 text-center text-sm text-muted">
                    We could not find your account. Please contact the bank.
                </p>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
                        <StatCard
                            label="Account number"
                            value={account.accountNumber}
                            icon={CreditCard}
                            tone="purple"
                        />
                        <BalanceCard balance={account.balance} />
                        <StatCard
                            label="Account status"
                            value={STATUS_TEXT[account.accountStatus]}
                            icon={ShieldCheck}
                            tone="orange"
                            valueClassName={account.accountStatus === "ACTIVE" ? "text-ink" : "text-sent"}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <CopyAccountNumber text={account.accountNumber} />
                    </div>

                    {account.accountStatus !== "ACTIVE" && (
                        <p role="status" className="rounded-xl bg-pastel-orange/30 px-5 py-4 text-sm text-sent">
                            {STATUS_NOTICE[account.accountStatus]}
                        </p>
                    )}

                    <section>
                        <SectionHeading>Profile</SectionHeading>
                        <div className="mt-6 max-w-2xl">
                            <DetailList
                                items={[
                                    { label: "Full name", value: account.fullName },
                                    { label: "Email", value: account.email },
                                    { label: "Phone", value: account.phone ?? "Not provided" },
                                    { label: "Customer since", value: account.memberSince },
                                ]}
                            />
                            <Link
                                href="/settings"
                                className="mt-4 inline-block text-sm font-medium text-ink underline"
                            >
                                Change password
                            </Link>
                        </div>
                    </section>
                </>
            )}
        </PageShell>
    );
}