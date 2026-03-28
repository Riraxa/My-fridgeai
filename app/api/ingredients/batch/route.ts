import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeString, escapeHtml } from "@/lib/security";
import { addApiSecurityHeaders } from "@/lib/securityHeaders";
import { checkUserLimit } from "@/lib/aiLimit";

type BatchItem = {
  name: string;
  amount?: number | null;
  unit?: string | null;
  category?: string | null;
  expirationDate?: string | Date | null;
  expiry?: string | Date | null; // legacy
  productId?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return addApiSecurityHeaders(
        NextResponse.json({ error: "認証が必要です" }, { status: 401 }),
      );
    }
    const userId = session.user.id;

    const body = await req.json().catch(() => null);
    const items = (body?.items ?? []) as BatchItem[];
    const idempotencyKey = (body?.idempotencyKey ?? null) as string | null;

    if (!Array.isArray(items) || items.length === 0) {
      return addApiSecurityHeaders(
        NextResponse.json({ error: "items が必要です" }, { status: 400 }),
      );
    }
    if (items.length > 50) {
      return addApiSecurityHeaders(
        NextResponse.json(
          { error: "一度に追加できるのは最大50件までです" },
          { status: 413 },
        ),
      );
    }

    // Idempotency: same user + key within a day returns ok
    if (idempotencyKey) {
      const existing = await prisma.usageHistory.findFirst({
        where: {
          userId,
          action: "INGREDIENT_BATCH_ADD",
          meta: { path: ["idempotencyKey"], equals: idempotencyKey } as any,
          date: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      });
      if (existing) {
        return addApiSecurityHeaders(
          NextResponse.json({ ok: true, savedCount: 0, idempotent: true }),
        );
      }
    }

    // Free limit check: ensure there is room for N items (best-effort)
    const limitCheck = await checkUserLimit(userId, "INGREDIENT_COUNT");
    if (!limitCheck.ok) {
      return addApiSecurityHeaders(
        NextResponse.json(
          {
            error:
              "食材登録上限に達しました（Freeプラン: 100件）。Proにアップグレードすると無制限になります。",
          },
          { status: 403 },
        ),
      );
    }

    // Sanitize and prepare
    const toCreate = items
      .map((it) => {
        const name = sanitizeString(it.name, 100);
        if (!name || name.trim().length === 0) return null;

        const unit = sanitizeString(it.unit ?? "個", 20) ?? "個";
        const category = sanitizeString(it.category ?? "その他", 50) ?? "その他";
        const amount =
          it.amount === null || it.amount === undefined
            ? null
            : Math.max(0, Math.min(999999, Number(it.amount) || 0));

        const rawDate = it.expirationDate ?? it.expiry;
        let expirationDate: Date | null = null;
        if (rawDate) {
          const parsed = new Date(rawDate);
          if (!isNaN(parsed.getTime()) && parsed > new Date("2000-01-01")) {
            expirationDate = parsed;
          }
        }

        return {
          userId,
          name,
          unit,
          category,
          amount,
          expirationDate,
          productId: it.productId ?? null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);

    if (toCreate.length === 0) {
      return addApiSecurityHeaders(
        NextResponse.json({ error: "有効な items がありません" }, { status: 400 }),
      );
    }

    const { inferIngredientType } = await import("@/lib/ingredient-inference");

    const created = await prisma.$transaction(async (tx) => {
      // re-check limit for Free with current count
      const currentCount = await tx.ingredient.count({ where: { userId } });
      const maxAllowed = currentCount + toCreate.length;
      if (!limitCheck.ok || limitCheck.remaining <= 0) {
        throw new Error("LIMIT_REACHED");
      }
      // best-effort: if remaining is smaller than batch, truncate
      const allowedN =
        typeof limitCheck.remaining === "number"
          ? Math.max(0, Math.min(toCreate.length, limitCheck.remaining))
          : toCreate.length;

      const sliced = toCreate.slice(0, allowedN);

      const rows = [];
      for (const it of sliced) {
        const inferred = inferIngredientType(it.name);
        const row = await tx.ingredient.create({
          data: {
            ...it,
            ingredientType: inferred.ingredientType,
          },
        });
        rows.push(row);
      }

      if (idempotencyKey) {
        await tx.usageHistory.create({
          data: {
            userId,
            action: "INGREDIENT_BATCH_ADD",
            meta: { idempotencyKey, requested: items.length, saved: rows.length },
          },
        });
      }

      return rows;
    });

    const sanitized = created.map((item) => ({
      ...item,
      name: escapeHtml(item.name ?? ""),
      unit: escapeHtml(item.unit ?? ""),
      category: escapeHtml(item.category ?? ""),
    }));

    return addApiSecurityHeaders(
      NextResponse.json({
        ok: true,
        savedCount: sanitized.length,
        items: sanitized,
      }),
    );
  } catch (e: any) {
    if (e?.message === "LIMIT_REACHED") {
      return addApiSecurityHeaders(
        NextResponse.json(
          {
            error:
              "食材登録上限に達しました（Freeプラン: 100件）。Proにアップグレードすると無制限になります。",
          },
          { status: 403 },
        ),
      );
    }
    console.error("ingredients batch API error:", e);
    return addApiSecurityHeaders(
      NextResponse.json({ error: "一括追加に失敗しました" }, { status: 500 }),
    );
  }
}

