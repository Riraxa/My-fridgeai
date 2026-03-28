//app/api/ingredients/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeString, escapeHtml } from "@/lib/security";
import { addApiSecurityHeaders } from "@/lib/securityHeaders";

// GET: 食材一覧取得
export async function GET(_req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = session.user.id;
    const list = await prisma.ingredient.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    // レスポンスデータのサニタイズ
    const sanitizedList = list.map((item) => ({
      ...item,
      name: escapeHtml(item.name ?? ""),
      unit: escapeHtml(item.unit ?? ""),
      category: escapeHtml(item.category ?? ""),
      ingredientType: item.ingredientType ?? "raw",
    }));

    return addApiSecurityHeaders(NextResponse.json({ items: sanitizedList }));
  } catch (e) {
    console.error("ingredients API error:", e);
    return addApiSecurityHeaders(
      NextResponse.json(
        { error: "食材リストの取得に失敗しました" },
        { status: 500 },
      ),
    );
  }
}

// POST: 新規追加
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = session.user.id;

    // 設計書: Freeは100件まで。制限チェック。
    const { checkUserLimit } = await import("@/lib/aiLimit");
    const limitCheck = await checkUserLimit(userId, "INGREDIENT_COUNT");
    if (!limitCheck.ok) {
      return NextResponse.json(
        {
          error:
            "食材登録上限に達しました（Freeプラン: 100件）。Proにアップグレードすると無制限になります。",
        },
        { status: 403 },
      );
    }

    const body = await req.json();

    // 入力検証とサニタイズ
    const name = sanitizeString(body.name, 100);
    const unit = sanitizeString(body.unit, 20);
    const category = sanitizeString(body.category, 50);
    const amountLevel = body.amountLevel
      ? sanitizeString(body.amountLevel, 20)
      : null;

    // amount/quantity validation
    let amountValue = body.amount !== undefined ? body.amount : body.quantity;
    const amount =
      amountValue !== null
        ? Math.max(0, Math.min(999999, Number(amountValue) || 0))
        : null;

    // 必須項目のチェック
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "食材名は必須です" }, { status: 400 });
    }

    // 有効な日付のチェック
    let expirationDate: Date | null = null;
    const rawDate = body.expirationDate ?? body.expiry;
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime()) && parsed > new Date("2000-01-01")) {
        expirationDate = parsed;
      }
    }

    // ingredientType is automatically inferred
    const { inferIngredientType } = await import("@/lib/ingredient-inference");
    const { ingredientType } = inferIngredientType(name);
    const productId = body.productId ?? null;

    const created = await prisma.ingredient.create({
      data: {
        userId,
        name,
        amount,
        amountLevel,
        unit: unit ?? "個",
        expirationDate,
        category: category ?? "その他",
        ingredientType,
        productId,
      },
    });

    // レスポンスのサニタイズ
    const sanitizedResponse = {
      ...created,
      name: escapeHtml(created.name),
      unit: escapeHtml(created.unit ?? ""),
      category: escapeHtml(created.category ?? ""),
    };

    return addApiSecurityHeaders(
      NextResponse.json({ item: sanitizedResponse }),
    );
  } catch (e) {
    console.error("ingredient create error:", e);
    return addApiSecurityHeaders(
      NextResponse.json({ error: "食材の追加に失敗しました" }, { status: 500 }),
    );
  }
}
