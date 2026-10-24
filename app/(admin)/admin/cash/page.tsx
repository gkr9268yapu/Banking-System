import CashForm, { type CashCustomer } from "@/components/CashForm";
import PageShell from "@/components/PageShell";
import { listCustomers } from "@/lib/adminCustomers";
import { requireUser } from "@/lib/auth";

export default async function AdminCashPage() {
    // Check on the server, in the page itself, that this is an ACTIVE admin.
    const user = await requireUser("ADMIN");

    // Only ACTIVE customers that have an account can get or lose money.
    const active = await listCustomers({ q: "", status: "active" });
    const customers: CashCustomer[] = active.flatMap((c) =>
        c.accountNumber && c.balance
            ? [{ userId: c.userId, name: c.fullName, accountNumber: c.accountNumber, balance: c.balance }]
            : [],
    );

    return (
        <PageShell title="Deposit / Withdraw" userName={user.fullName} role="admin">
            <CashForm customers={customers} />
        </PageShell>
    );
}