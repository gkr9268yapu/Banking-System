import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth";
import { AdminActionError, createCustomer } from "@/lib/adminCustomers";
import { parseCreateCustomerInput } from "@/lib/validators";

// POST /api/admin/customers
// Body: { fullName, email, phone, password }
export async function POST(request: Request) {
    // Only a signed-in, ACTIVE admin may create customers. The role is read
    // from the database, not from the browser.
    const auth = await authorizeApi("ADMIN");
    if (!auth.ok) return auth.response;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const input = parseCreateCustomerInput(body);
    if (!input.ok) {
        return NextResponse.json({ error: input.error }, { status: 400 });
    }

    try {
        // The admin id comes from the session and goes into the audit log.
        const created = await createCustomer(auth.user.userId, input.value);
        return NextResponse.json({ ok: true, ...created }, { status: 201 });
    } catch (error) {
        if (error instanceof AdminActionError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Create customer error:", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: "The customer could not be created. Nothing was saved. Please try again." },
            { status: 500 },
        );
    }
}