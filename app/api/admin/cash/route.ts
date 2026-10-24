import { NextResponse } from "next/server";
import { AdminActionError } from "@/lib/adminCustomers";
import { authorizeApi } from "@/lib/auth";
import { adminCash } from "@/lib/cash";
import { parseCashInput } from "@/lib/validators";

// POST /api/admin/cash
// Body: { userId, type: "DEPOSIT" | "WITHDRAW", amount, note }
export async function POST(request: Request) {
    // Only a signed-in, ACTIVE admin may move money. The role is read from the
    // database, not from the browser.
    const auth = await authorizeApi("ADMIN");
    if (!auth.ok) return auth.response;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const input = parseCashInput(body);
    if (!input.ok) {
        return NextResponse.json({ error: input.error }, { status: 400 });
    }

    try {
        // The admin id comes from the session and goes into the audit log.
        const result = await adminCash(auth.user.userId, input.value);
        return NextResponse.json({
            ok: true,
            transactionId: result.transactionId,
            customerName: result.customerName,
            amount: input.value.amount,
            newBalance: result.newBalance,
        });
    } catch (error) {
        if (error instanceof AdminActionError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Cash error:", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: "The operation could not be completed. No money was moved. Please try again." },
            { status: 500 },
        );
    }
}