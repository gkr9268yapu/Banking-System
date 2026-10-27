"use client"; // Error pages must be Client Components

// Last safety net for pages that have no error page of their own
// (Settings, the login page). The real error is only written to the server log.
export default function RootError({ retry }: { retry: () => void }) {
    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center sm:p-10">
                <h1 className="text-[22px] font-bold text-ink">Something went wrong</h1>
                <p className="mt-2 text-sm text-muted">
                    We could not load this page. Please try again in a moment.
                </p>
                <button
                    type="button"
                    onClick={() => retry()}
                    className="mt-6 rounded-xl bg-ink px-6 py-3 text-sm font-medium text-white"
                >
                    Try again
                </button>
            </div>
        </main>
    );
}