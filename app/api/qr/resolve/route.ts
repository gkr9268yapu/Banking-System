import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth";
import { resolveQrToken } from "@/lib/qr";
import { parseQrPayload } from "@/lib/qrValidators";
import { TransferError } from "@/lib/transfer";

// POST /api/qr/resolve
// Body: { payload: "BANKPAY:<token>" }
// Shows WHO owns a scanned QR before any money moves.
// It returns the name and a masked account number only. Never the balance.
export async function POST(request: Request) {
    const auth = await authorizeApi("CUSTOMER");
    if (!auth.ok) return auth.response;

    if (auth.user.accountId === null) {
        return NextResponse.json({ error: "We could not find your account." }, { status: 404 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const payload =
        typeof body === "object" && body !== null ? (body as Record<string, unknown>).payload : null;
    const token = parseQrPayload(payload);
    if (!token.ok) {
        return NextResponse.json({ error: token.error }, { status: 400 });
    }

    try {
        const receiver = await resolveQrToken(token.value, auth.user.accountId);
        return NextResponse.json({ name: receiver.name, maskedAccount: receiver.maskedAccount });
    } catch (error) {
        if (error instanceof TransferError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("QR resolve error:", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: "Could not read the QR code. Please try again." },
            { status: 500 },
        );
    }
}