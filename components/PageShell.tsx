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
    <div className="h-[100dvh] overflow-hidden p-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] md:p-2">
      <div className="flex h-full overflow-hidden rounded-3xl bg-white">
        <Sidebar role={role} activeHref={activeHref} />

        {/* min-w-0 stops wide content from stretching the page sideways */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col px-5 pt-6 md:px-10 md:pt-8">
          {/* On phones there is no sidebar, so show the bank name here */}
          <p className="mb-4 text-xl text-ink md:hidden">{BANK_NAME}</p>

          <Header title={title} userName={userName} />
          <div className="mt-10 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(6rem+env(safe-area-inset-bottom))] pr-1 space-y-10 md:pb-10">
            {children}
          </div>
        </main>
      </div>

      <BottomNav role={role} activeHref={activeHref} />
    </div>
  );
}
