import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            select: { authMethod: true },
        });

        if (!user) {
            return NextResponse.json({ authMethod: "not_found" });
        }

        return NextResponse.json({ authMethod: user.authMethod });
    } catch (error) {
        console.error("[check-auth-method] error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
