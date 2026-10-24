import Link from "next/link";
import CreateCustomerForm from "@/components/CreateCustomerForm";
import PageShell from "@/components/PageShell";
import { requireUser } from "@/lib/auth";

export default async function NewCustomerPage() {
    // Check on the server, in the page itself, that this is an ACTIVE admin.
    const user = await requireUser("ADMIN");

    return (
        <PageShell title="Create customer" userName={user.fullName} role="admin">
            <Link href="/admin/customers" className="text-sm text-muted underline">
                Back to customers
            </Link>
            <CreateCustomerForm />
        </PageShell>
    );
}