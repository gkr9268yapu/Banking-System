import { Suspense } from "react";
import AdminDashboardContent from "@/components/AdminDashboardContent";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import PageShell from "@/components/PageShell";
import { requireUser } from "@/lib/auth";

export default async function AdminDashboardPage() {
  // Check on the server, in the page itself, that this is an ACTIVE admin.
  // A customer is sent to /dashboard, someone not signed in to the login page.
  const user = await requireUser("ADMIN");

  return (
    <PageShell title="Dashboard" userName={user.fullName} role="admin">
      {/* The shell shows at once, the skeleton shows while the data loads. */}
      <Suspense fallback={<DashboardSkeleton />}>
        <AdminDashboardContent />
      </Suspense>
    </PageShell>
  );
}