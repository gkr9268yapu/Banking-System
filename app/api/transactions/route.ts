import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth";
import { getTransactions, parseFilters } from "@/lib/transactions";

// GET /api/transactions?tab=sent&from=2026-10-01&to=2026-10-31&page=2
// tab: all (default), sent or received. from, to and page are optional.
export async function GET(request: Request) {
    // Only a signed-in, ACTIVE customer can see transactions.
    const auth = await authorizeApi("CUSTOMER");
    if (!auth.ok) return auth.response;

    // The account comes from the login session. The browser cannot ask for
    // another customer's history, because there is no account id in the request.
    const accountId = auth.user.accountId;
    if (accountId === null) {
        return NextResponse.json({ error: "We could not find your account." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const filters = parseFilters(Object.fromEntries(searchParams));
    if (!filters.ok) {
        return NextResponse.json({ error: filters.error }, { status: 400 });
    }

    try {
        return NextResponse.json(await getTransactions(accountId, filters.value));
    } catch (error) {
        console.error("Transactions error:", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: "Could not load transactions. Please try again." },
            { status: 500 },
        );
    }
}