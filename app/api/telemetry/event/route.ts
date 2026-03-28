import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type TelemetryBody = {
  action: string;
  meta?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as TelemetryBody | null;
    const action = body?.action;
    const meta = body?.meta ?? {};

    if (!action || typeof action !== "string" || action.length > 80) {
      return NextResponse.json({ error: "action が不正です" }, { status: 400 });
    }

    await prisma.usageHistory.create({
      data: {
        userId: session.user.id,
        action,
        meta: meta as any,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("telemetry error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

