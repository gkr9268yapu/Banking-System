import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";

// Grey placeholder page shown while a page loads after a tap in the menu.
// It has the same frame and navigation as PageShell, so nothing jumps.
export default function PageSkeleton({ role }: { role: "customer" | "admin" }) {
    // motion-safe: the pulse animation is skipped for people who turned animations off.
    const block = "rounded-xl bg-surface motion-safe:animate-pulse";

    return (
        <div className="h-dvh overflow-hidden p-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] md:p-2">
            <div className="flex h-full overflow-hidden rounded-3xl bg-white">
                <Sidebar role={role} />
                <main
                    role="status"
                    aria-label="Loading"
                    className="min-h-0 min-w-0 flex-1 overflow-hidden px-5 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 md:px-10 md:pb-10 md:pt-8"
                >
                    <div className={`mb-4 h-6 w-24 md:hidden ${block}`} />
                    <div className={`h-8 w-48 ${block}`} />
                    <div className="mt-10 space-y-6">
                        <div className={`h-[106px] ${block}`} />
                        <div className={`h-[260px] ${block}`} />
                        <div className={`h-[72px] ${block}`} />
                        <div className={`h-[72px] ${block}`} />
                    </div>
                </main>
            </div>
            <BottomNav role={role} />
        </div>
    );
}