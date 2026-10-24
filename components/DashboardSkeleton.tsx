// Grey placeholder shapes shown while the dashboard data loads.
// It has the same layout as DashboardContent so nothing jumps when the data arrives.

function Block({ className }: { className: string }) {
    // motion-safe: the pulse animation is skipped for people who turned animations off.
    return <div className={`rounded-xl motion-safe:animate-pulse ${className}`} />;
}

export default function DashboardSkeleton() {
    return (
        <div role="status" aria-label="Loading your dashboard" className="space-y-10">
            {/* Three stat cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
                <Block className="h-[106px] bg-surface" />
                <Block className="h-[106px] bg-surface" />
                <Block className="h-[106px] bg-surface" />
            </div>

            {/* Two charts */}
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
                <div>
                    <Block className="h-7 w-40 bg-surface" />
                    <Block className="mt-6 h-[250px] bg-chart-blue-panel" />
                </div>
                <div>
                    <Block className="h-7 w-44 bg-surface" />
                    <Block className="mt-6 h-[250px] bg-chart-purple-panel" />
                </div>
            </div>

            {/* List and dark table */}
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
                <div>
                    <Block className="h-7 w-52 bg-surface" />
                    <div className="mt-6 space-y-3">
                        {[0, 1, 2, 3, 4].map((row) => (
                            <Block key={row} className="h-[72px] bg-surface" />
                        ))}
                    </div>
                </div>
                <div>
                    <Block className="h-7 w-32 bg-surface" />
                    <Block className="mt-6 h-[270px] bg-night/80" />
                </div>
            </div>
        </div>
    );
}