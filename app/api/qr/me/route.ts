import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { authorizeApi } from "@/lib/auth";
import { getOrCreateQrToken } from "@/lib/qr";
import { QR_PREFIX } from "@/lib/qrValidators";

// GET /api/qr/me
// Returns the signed-in customer's own QR image (as a PNG data URL).
export async function GET() {
    const auth = await authorizeApi("CUSTOMER");
    if (!auth.ok) return auth.response;

    // The account comes from the login session, never from the browser.
    const { accountId, accountNumber, fullName } = auth.user;
    if (accountId === null || accountNumber === null) {
        return NextResponse.json({ error: "We could not find your account." }, { status: 404 });
    }

    try {
        const token = await getOrCreateQrToken(accountId);

        // The picture holds only "BANKPAY:<token>". No balance, no account number.
        const image = await QRCode.toDataURL(`${QR_PREFIX}${token}`, {
            width: 512,
            margin: 2,
            errorCorrectionLevel: "M",
        });

        return NextResponse.json(
            { image, name: fullName, maskedAccount: `******${accountNumber.slice(-4)}` },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        console.error("QR error:", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: "Could not load your QR code. Please try again." },
            { status: 500 },
        );
    }
}