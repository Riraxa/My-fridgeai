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
import { z } from "zod";

// ============================================================================
// バリデーションスキーマ
// ============================================================================

const TasteEventType = z.enum([
  "used",        // 料理で使用（ポジティブ）
  "skipped",     // スキップ（ネガティブ）
  "liked",       // 明示的な好評価
  "disliked",    // 明示的な悪評価
  "repeated",    // 再選択（強いポジティブ）
  "removed",     // 献立削除（強いネガティブ）
]);

const TasteEventSource = z.enum([
  "cook",        // /api/menu/cook 実行時
  "manual",      // 手動入力
  "feedback",    // フィードバックUI
  "inference",   // システム推論
]);

const CreateTasteEventSchema = z.object({
  mealPlanResultId: z.string().optional(),  // MenuGeneration.id
  ingredientKey: z.string(),               // 正規化済み食材キー
  eventType: TasteEventType,
  weight: z.number().min(0.1).max(10).default(1.0),
  source: TasteEventSource,
});

const BatchCreateSchema = z.object({
  events: z.array(CreateTasteEventSchema).min(1).max(50),
});

// ============================================================================
// 集約定数
// ============================================================================

// 集約ウィンドウ: 30分以内の同一イベントはweight加算
const AGGREGATION_WINDOW_MINUTES = 30;

// 集約対象となるイベントタイプ
const AGGREGATABLE_TYPES = new Set([
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
      ingredientKey: string;
      eventType: string;
      aggregated: boolean;
      previousWeight?: number;
      newWeight: number;
    }> = [];

    // トランザクションで全イベント処理
    await prisma.$transaction(async (tx) => {
      for (const event of events) {
        // 食材キーを正規化
        const normalizedKey = normalizeIngredientKey(event.ingredientKey);

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
              ingredientKey: normalizedKey,
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
            eventType: event.eventType,
            weight: event.weight,
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
// GET /api/taste/event - イベント取得（デバッグ/管理用）
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

    if (!event || event.userId !== userId) {
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
