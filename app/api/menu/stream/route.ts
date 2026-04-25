// app/api/menu/stream/route.ts
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkUserLimit } from "@/lib/aiLimit";
import type { ConstraintMode } from "@/types";
import { NextResponse } from "next/server";
import { after } from "next/server";
import type { Ingredient } from "@prisma/client";
import { checkIdempotency, recordIdempotency } from "@/lib/idempotency";
import { redis, isRedisEnabled } from "@/lib/redis";
import { MenuStreamSchema } from "@/lib/validations/api-schemas";
import {
  processMenuGeneration,
  type ProcessPreferences,
} from "@/lib/services/menu-generation/stream-processor";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const validation = MenuStreamSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: "Invalid request data", 
        details: validation.error.format() 
      }, { status: 400 });
    }

    let { servings, budget, mode, idempotencyKey } = validation.data;

    // 0.5 Redis Distributed Generation Lock
    if (isRedisEnabled()) {
      const lockKey = `menu_gen_lock:${userId}`;
      const locked = await redis!.set(lockKey, "locked", {
        ex: 180, // 3 minutes timeout
        nx: true,
      });
      if (!locked) {
        return NextResponse.json(
          { error: "別の献立生成が進行中です。しばらくお待ちください。" },
          { status: 429 }
        );
      }
    }

    // 0. Idempotency Check
    if (idempotencyKey) {
      const cached = await checkIdempotency("MENU_STREAM", idempotencyKey, userId);
      const meta = cached?.meta as Record<string, unknown> | undefined;
      if (cached && meta?.generationId) {
        return NextResponse.json({
          success: true,
          generationId: String(meta.generationId),
          status: "processing",
          idempotent: true
        });
      }
    }

    // 1. 回数制限チェック (Readonly)
    const limitCheck = await checkUserLimit(userId, "AI_MENU", { readonly: true });
    if (!limitCheck.ok) {
      return NextResponse.json({ error: "1日の生成回数制限に達しました" }, { status: 429 });
    }

    // 2. ユーザープラン、在庫、設定の取得
    const [user, dbIngredients, preferences] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }),
      prisma.ingredient.findMany({ where: { userId } }),
      prisma.userPreferences.findUnique({ 
        where: { userId },
        select: { customImplicitIngredients: true }
      }).catch(() => null),
    ]);

    if (!dbIngredients || dbIngredients.length === 0) {
      return NextResponse.json(
        { error: "冷蔵庫に食材がありません。先に食材を追加してください。" },
        { status: 400 }
      );
    }

    const isPro = user?.plan === "PRO";

    // 3. オプションのバリデーション (Zod で実施済みのため基本不要だが念のため)
    const constraintMode: ConstraintMode = mode;
    
    // 3.8. 既存の生成リクエストがあればキャンセル（多重実行防止・ゴースト対策）
    try {
      await prisma.menuGeneration.updateMany({
        where: {
          userId,
          status: { in: ["processing", "pending"] },
        },
        data: {
          status: "failed",
          progressStep: "cancelled",
        },
      });
    } catch (e) {
      // 失敗しても新規生成は止めない
    }

    // 4. 保留中のレコードを作成
    const generation = await prisma.menuGeneration.create({
      data: {
        userId,
        status: "processing",
        progressStep: "preparing",
        mainMenu: {},
        alternativeA: {},
        nutritionInfo: {},
        usedIngredients: {},
        shoppingList: {},
        servings,
        budget: budget ?? undefined,
        requestHash: "streaming-" + Date.now(), // 簡易ハッシュ
        generatedAt: new Date(),
      },
    });

    // 5. バックグラウンドでAI生成を実行（タブを閉じても継続）
    after(async () => {
      try {
        await processMenuGeneration(
          generation.id,
          userId,
          dbIngredients,
          { servings, budget: budget ?? null, mode: constraintMode },
          isPro,
          preferences
        );
      } finally {
        // Release Redis lock in both success and failure cases
        if (isRedisEnabled()) {
          await redis!.del(`menu_gen_lock:${userId}`);
        }
      }
    });

    // 5.5 Record Idempotency
    if (idempotencyKey) {
      await recordIdempotency("MENU_STREAM", idempotencyKey, userId, { generationId: generation.id });
    }

    // 6. 即座にgenerationIdを返却
    return NextResponse.json({
      success: true,
      generationId: generation.id,
      status: "processing",
    });
  } catch (error: unknown) {
    console.error("[MenuStream] POST Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

