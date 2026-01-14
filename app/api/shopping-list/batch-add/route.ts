import { getToken } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const token = await getToken({
      req: req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const userId = token.sub as string;

    // レート制限
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rl = await rateLimit(ip, "batch-add", 20, 60);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "リクエストが多すぎます" },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? (body.items as string[]) : [];

    if (items.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    // 重複チェックなどは厳密に行わず、どんどん追加する（既存アプリの挙動に合わせる）
    // 必要なら既存チェックを入れるが、今回はシンプルに createMany
    const data = items.map((name) => ({
      userId,
      name,
      quantity: 1,
      unit: "個",
      checked: false,
    }));

    await prisma.shoppingListItem.createMany({
      data,
    });

    return NextResponse.json({ processed: data.length });
  } catch (err) {
    console.error("batch-add error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
