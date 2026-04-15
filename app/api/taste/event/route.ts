/**
 * 機能: TasteEvent API エンドポイント
 * 目的: 献立に対するユーザーの好みイベントを記録し、集約する
 * 非目的: 生のイベントデータの永続化（集約済みデータを優先）
 * 変更方針: 破壊的変更禁止 / 集約ロジックでレコード増加抑制
 * セキュリティ: 認証必須 / 同一ユーザーイベントのみ操作可能
 *
 * 集約戦略:
 * - 同一条件のイベントは30分以内でweight加算
 * - レコード数を抑制しつつ、頻度データを保持
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeIngredientKey } from "@/lib/taste/normalizeIngredientKey";
import { buildAndSaveTasteProfile } from "@/lib/taste/buildTasteProfile";
import { z } from "zod";
import { after } from "next/server";

// ============================================================================
// バリデーションスキーマ
// ============================================================================

const TasteEventType = z.enum([
  "want_again",  // また作りたい（ポジティブ）
  "okay",        // まあまあ（ニュートラル）
  "never_again", // もう作らない（ネガティブ）
  // 旧タイプ（後方互換）
  "used",
  "skipped",
  "liked",
  "disliked",
  "repeated",
  "removed",
]);

const TasteEventSource = z.enum([
  "revisit",     // アプリ再訪時
  "swipe",       // スワイプUI
  "cook",        // /api/menu/cook 実行時
  "manual",      // 手動入力
  "feedback",    // フィードバックUI
  "inference",   // システム推論
]);

const CreateTasteEventSchema = z.object({
  mealPlanResultId: z.string().optional(),
  // 3軸データ（少なくとも1つ必須）
  ingredientKey: z.string().optional(),
  dishName: z.string().optional(),
  cookingMethod: z.string().optional(),
  eventType: TasteEventType,
  weight: z.number().min(0.1).max(10).default(1.0),
  source: TasteEventSource,
  decayFactor: z.number().min(0).max(1).default(1.0).optional(),
});

const BatchCreateSchema = z.object({
  events: z.array(CreateTasteEventSchema).min(1).max(50),
});

// ============================================================================
// 集約定数
// ============================================================================

// 集約ウィンドウ: 30分以内の同一イベントはweight加算
const AGGREGATION_WINDOW_MINUTES = 30;

// 集約対象となるイベントタイプ（3段階評価 + 旧タイプ）
const AGGREGATABLE_TYPES = new Set([
  "want_again",
  "okay", 
  "never_again",
  "used",
  "skipped",
  "liked",
  "disliked",
]);

// ============================================================================
// POST /api/taste/event - イベント記録（集約ロジック付き）
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();

    // 単一イベント or バッチ
    const isBatch = Array.isArray(body.events);
    let events: z.infer<typeof CreateTasteEventSchema>[];

    if (isBatch) {
      const parsed = BatchCreateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "バリデーションエラー", details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      events = parsed.data.events;
    } else {
      const parsed = CreateTasteEventSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "バリデーションエラー", details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      events = [parsed.data];
    }

    // 結果追跡
    const results: Array<{
      eventId: string;
      ingredientKey: string | null;
      eventType: string;
      aggregated: boolean;
      previousWeight?: number;
      newWeight: number;
    }> = [];

    // トランザクションで全イベント処理
    await prisma.$transaction(async (tx) => {
        for (const event of events) {
        // 少なくとも1つの3軸データが必要
        if (!event.ingredientKey && !event.dishName && !event.cookingMethod) {
          throw new Error("ingredientKey, dishName, cookingMethodのいずれかが必要です");
        }
        
        // 食材キーを正規化（存在する場合）
        const normalizedKey = event.ingredientKey 
          ? normalizeIngredientKey(event.ingredientKey)
          : null;

        // householdId取得（存在する場合）
        let householdId: string | null = null;
        if (event.mealPlanResultId) {
          const menuGen = await tx.menuGeneration.findUnique({
            where: { id: event.mealPlanResultId },
            select: { householdId: true },
          });
          householdId = menuGen?.householdId ?? null;
        }

        // 集約対象の場合、既存イベントを検索
        let aggregated = false;
        let previousWeight: number | undefined;

        if (AGGREGATABLE_TYPES.has(event.eventType)) {
          const windowStart = new Date(
            Date.now() - AGGREGATION_WINDOW_MINUTES * 60 * 1000
          );

          const existingEvent = await tx.tasteEvent.findFirst({
            where: {
              userId,
              ...(normalizedKey && { ingredientKey: normalizedKey }),
              ...(event.dishName && { dishName: event.dishName }),
              ...(event.cookingMethod && { cookingMethod: event.cookingMethod }),
              eventType: event.eventType,
              source: event.source,
              mealPlanResultId: event.mealPlanResultId ?? null,
              createdAt: {
                gte: windowStart,
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          });

          if (existingEvent) {
            // 集約: weight加算
            previousWeight = existingEvent.weight;
            const newWeight = Math.min(
              previousWeight + event.weight,
              10 // 最大weight制限
            );

            await tx.tasteEvent.update({
              where: { id: existingEvent.id },
              data: {
                weight: newWeight,
                decayFactor: event.decayFactor ?? 1.0,
              },
            });

            results.push({
              eventId: existingEvent.id,
              ingredientKey: normalizedKey,
              eventType: event.eventType,
              aggregated: true,
              previousWeight,
              newWeight,
            });
            aggregated = true;
            continue; // 次のイベントへ
          }
        }

        // 新規イベント作成
        const newEvent = await tx.tasteEvent.create({
          data: {
            userId,
            householdId,
            mealPlanResultId: event.mealPlanResultId ?? null,
            ingredientKey: normalizedKey,
            dishName: event.dishName ?? null,
            cookingMethod: event.cookingMethod ?? null,
            eventType: event.eventType,
            weight: event.weight,
            decayFactor: event.decayFactor ?? 1.0,
            source: event.source,
          },
        });

        results.push({
          eventId: newEvent.id,
          ingredientKey: normalizedKey,
          eventType: event.eventType,
          aggregated: false,
          newWeight: event.weight,
        });
      }
    });

    // 背景でプロファイルを再構築（非ブロッキング）
    after(() => {
      buildAndSaveTasteProfile(userId).catch(e => {
        console.error("[TasteProfile] Background rebuild failed:", e);
      });
    });

    return NextResponse.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("[TasteEvent] Error:", error);
    return NextResponse.json(
      { error: "イベント記録に失敗しました" },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/taste/event - ユーザーの味イベント履歴を取得
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = session.user.id;
    const ingredientKey = searchParams.get("ingredientKey");
    const eventType = searchParams.get("eventType");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
    const days = parseInt(searchParams.get("days") ?? "30");

    const since = new Date();
    since.setDate(since.getDate() - days);

    const events = await prisma.tasteEvent.findMany({
      where: {
        userId,
        ...(ingredientKey && { ingredientKey: normalizeIngredientKey(ingredientKey) }),
        ...(eventType && { eventType }),
        createdAt: {
          gte: since,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      select: {
        id: true,
        userId: true,
        householdId: true,
        mealPlanResultId: true,
        ingredientKey: true,
        dishName: true,
        cookingMethod: true,
        eventType: true,
        weight: true,
        decayFactor: true,
        source: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      count: events.length,
      events,
    });
  } catch (error) {
    console.error("[TasteEvent] GET Error:", error);
    return NextResponse.json(
      { error: "イベント取得に失敗しました" },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/taste/event/:id - イベント削除（補正用）
// ============================================================================

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("id");

    if (!eventId) {
      return NextResponse.json(
        { error: "イベントIDが必要です" },
        { status: 400 }
      );
    }

    // 所有権確認
    const event = await prisma.tasteEvent.findUnique({
      where: { id: eventId },
      select: { userId: true },
    });

    if (event?.userId !== userId) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 }
      );
    }

    await prisma.tasteEvent.delete({
      where: { id: eventId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TasteEvent] DELETE Error:", error);
    return NextResponse.json(
      { error: "イベント削除に失敗しました" },
      { status: 500 }
    );
  }
}
