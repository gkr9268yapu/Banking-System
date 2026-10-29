import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth";
import { AdminActionError, changeCustomerStatus } from "@/lib/adminCustomers";
import { isActionName } from "@/lib/customerActions";

// POST /api/admin/customers/12/status
// Body: { action: "BLOCK_USER" | "UNBLOCK_USER" | "DEACTIVATE_USER" | "REACTIVATE_USER" | "DELETE_USER" }
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    // Only a signed-in, ACTIVE admin may change a customer.
    const auth = await authorizeApi("ADMIN");
    if (!auth.ok) return auth.response;

    // The id in the address must be plain digits.
    const { id } = await params;
    if (!/^\d{1,10}$/.test(id)) {
        return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const action = (body as { action?: unknown } | null)?.action;
    if (!isActionName(action)) {
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }

    try {
        const status = await changeCustomerStatus(auth.user.userId, Number(id), action);
        return NextResponse.json({ ok: true, status });
    } catch (error) {
        if (error instanceof AdminActionError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Customer action error:", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: "The action could not be completed. Nothing was changed. Please try again." },
            { status: 500 },
        );
    }
}