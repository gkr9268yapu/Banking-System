import type { ReactNode } from "react";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { BANK_NAME } from "@/lib/config";

type PageShellProps = {
  title: string;
  userName: string;
  role: "customer" | "admin";
  // Optional: force which sidebar link looks active (used by the demo page).
  activeHref?: string;
  children: ReactNode;
};

// The frame every page sits in:
// lavender border, big white rounded card, sidebar on the left (laptop),
// bottom bar (phone), header on top and the page content below it.
export default function PageShell({
  title,
  userName,
  role,
  activeHref,
  children,
}: PageShellProps) {
  return (
    <div className="min-h-screen p-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] md:p-2">
      <div className="flex min-h-[calc(100vh-0.75rem)] overflow-hidden rounded-3xl bg-white md:min-h-[calc(100vh-1rem)]">
        <Sidebar role={role} activeHref={activeHref} />

        {/* min-w-0 stops wide content from stretching the page sideways */}
        <main className="min-w-0 flex-1 px-5 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 md:px-10 md:pb-10 md:pt-8">
          {/* On phones there is no sidebar, so show the bank name here */}
          <p className="mb-4 text-xl text-ink md:hidden">{BANK_NAME}</p>

          <Header title={title} userName={userName} role={role} />
          <div className="mt-10 space-y-10">{children}</div>
        </main>
      </div>

      <BottomNav role={role} activeHref={activeHref} />
    </div>
  );
}