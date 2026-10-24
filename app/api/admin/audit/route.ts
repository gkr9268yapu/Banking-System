import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth";
import { getAuditLog, parsePage } from "@/lib/adminAudit";

// GET /api/admin/audit?page=2
// One page (20 rows) of the audit log, newest first.
export async function GET(request: Request) {
    // Only a signed-in, ACTIVE admin may read the audit log.
    const auth = await authorizeApi("ADMIN");
    if (!auth.ok) return auth.response;

    const page = parsePage(new URL(request.url).searchParams.get("page") ?? undefined);

    try {
        return NextResponse.json(await getAuditLog(page));
    } catch (error) {
        console.error("Audit log error:", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: "Could not load the audit log. Please try again." },
            { status: 500 },
        );
    }
}