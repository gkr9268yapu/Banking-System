import { Suspense } from "react";
import DashboardContent from "@/components/DashboardContent";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import PageShell from "@/components/PageShell";
import QuickActions from "@/components/QuickActions";
import { requireUser } from "@/lib/auth";

export default async function CustomerDashboardPage() {
  // Check on the server, in the page itself, that this is an ACTIVE customer.
  const user = await requireUser("CUSTOMER");

  return (
    <PageShell title="Dashboard" userName={user.fullName} role="customer">
      {/* Four big buttons, phones only */}
      <QuickActions />

      {user.accountId === null ? (
        <p className="rounded-xl bg-surface px-5 py-8 text-center text-sm text-muted">
          We could not find your account. Please contact the bank.
        </p>
      ) : (
        // The shell above shows at once, the skeleton shows while the data loads.
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent
            accountId={user.accountId}
            accountNumber={user.accountNumber}
          />
        </Suspense>
      )}
    </PageShell>
  );
}