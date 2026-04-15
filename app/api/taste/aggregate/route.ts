// GENERATED_BY_AI: 2026-04-05 味の嗜好集計API（時間減衰対応）
/**
 * POST /api/taste/aggregate
 * ユーザーの嗜好データを集計し、UserTasteProfileを更新
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 時間減衰定数
const HALF_LIFE_DAYS = 30; // 30日で半減

/**
 * 時間減衰係数を計算
 * 指数関数的減衰: 30日で半減
 */
function calculateDecayFactor(eventAgeInDays: number): number {
  return Math.exp(-eventAgeInDays * Math.log(2) / HALF_LIFE_DAYS);
}

/**
 * スコアを計算（時間減衰考慮）
 */
function calculateScore(events: Array<{ eventType: string; weight: number; createdAt: Date }>): number {
  if (events.length === 0) return 0;
  
  const now = Date.now();
  const totalWeight = events.reduce((sum, event) => {
    // イベントタイプによるベース重み
    const baseWeight = 
      event.eventType === "want_again" ? 1.0 :
      event.eventType === "okay" ? 0.2 :
      event.eventType === "never_again" ? -1.0 :
      event.eventType === "liked" ? 0.8 :
      event.eventType === "disliked" ? -0.8 :
      event.eventType === "used" ? 0.5 :
      event.eventType === "skipped" ? -0.5 :
      event.eventType === "repeated" ? 1.2 :
      event.eventType === "removed" ? -1.2 :
      0;
    
    // 時間減衰
    const ageInDays = (now - event.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const decayFactor = calculateDecayFactor(ageInDays);
    
    return sum + (baseWeight * event.weight * decayFactor);
  }, 0);
  
  // 平均化（-1〜1の範囲に正規化）
  return Math.max(-1, Math.min(1, totalWeight / Math.sqrt(events.length)));
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = session.user.id;

    // ユーザーの全イベントを取得（直近90日）
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const events = await (prisma as any).tasteEvent.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
      select: {
        ingredientKey: true,
        dishName: true,
        cookingMethod: true,
        eventType: true,
        weight: true,
        createdAt: true,
      },
    });

    // 3軸ごとに集計
    const ingredientEvents: Record<string, typeof events> = {};
    const dishEvents: Record<string, typeof events> = {};
    const methodEvents: Record<string, typeof events> = {};

    events.forEach((event: any) => {
      if (event.ingredientKey) {
        ingredientEvents[event.ingredientKey] = ingredientEvents[event.ingredientKey] || [];
        ingredientEvents[event.ingredientKey].push(event);
      }
      if (event.dishName) {
        dishEvents[event.dishName] = dishEvents[event.dishName] || [];
        dishEvents[event.dishName].push(event);
      }
      if (event.cookingMethod) {
        methodEvents[event.cookingMethod] = methodEvents[event.cookingMethod] || [];
        methodEvents[event.cookingMethod].push(event);
      }
    });

    // スコア計算
    const ingredientScores: Record<string, number> = {};
    const dishScores: Record<string, number> = {};
    const methodScores: Record<string, number> = {};

    Object.entries(ingredientEvents).forEach(([key, evs]) => {
      ingredientScores[key] = calculateScore(evs);
    });

    Object.entries(dishEvents).forEach(([key, evs]) => {
      dishScores[key] = calculateScore(evs);
    });

    Object.entries(methodEvents).forEach(([key, evs]) => {
      methodScores[key] = calculateScore(evs);
    });

    // お気に入り/苦手リストを更新（スコア閾値: 0.3）
    const favoriteIngredients = Object.entries(ingredientScores)
      .filter(([, score]) => score >= 0.3)
      .map(([key]) => key);
    
    const dislikedIngredients = Object.entries(ingredientScores)
      .filter(([, score]) => score <= -0.3)
      .map(([key]) => key);

    const favoriteDishes = Object.entries(dishScores)
      .filter(([, score]) => score >= 0.3)
      .map(([key]) => key);
    
    const dislikedDishes = Object.entries(dishScores)
      .filter(([, score]) => score <= -0.3)
      .map(([key]) => key);

    const favoriteMethods = Object.entries(methodScores)
      .filter(([, score]) => score >= 0.3)
      .map(([key]) => key);
    
    const dislikedMethods = Object.entries(methodScores)
      .filter(([, score]) => score <= -0.3)
      .map(([key]) => key);

    // UserTasteProfileを更新
    await (prisma as any).userTasteProfile.upsert({
      where: { userId },
      create: {
        userId,
        favoriteIngredients,
        dislikedIngredients,
        ingredientScores,
        favoriteDishes,
        dislikedDishes,
        dishScores,
        favoriteMethods,
        dislikedMethods,
        methodScores,
        version: 2,
      },
      update: {
        favoriteIngredients,
        dislikedIngredients,
        ingredientScores,
        favoriteDishes,
        dislikedDishes,
        dishScores,
        favoriteMethods,
        dislikedMethods,
        methodScores,
        version: 2,
      },
    });

    // 各イベントのdecayFactorを更新
    const now = Date.now();
    for (const event of events) {
      const ageInDays = (now - event.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const decayFactor = calculateDecayFactor(ageInDays);
      
      await (prisma as any).tasteEvent.updateMany({
        where: {
          userId,
          createdAt: event.createdAt,
        },
        data: { decayFactor },
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalEvents: events.length,
        ingredientCount: Object.keys(ingredientScores).length,
        dishCount: Object.keys(dishScores).length,
        methodCount: Object.keys(methodScores).length,
      },
      profile: {
        favoriteIngredients,
        dislikedIngredients,
        favoriteDishes,
        dislikedDishes,
        favoriteMethods,
        dislikedMethods,
      },
    });
  } catch (error) {
    console.error("[TasteAggregate] Error:", error);
    return NextResponse.json(
      { error: "嗜好データの集計に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/taste/aggregate
 * 現在の嗜好プロファイルを取得
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = session.user.id;

    const profile = await (prisma as any).userTasteProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return NextResponse.json({
        exists: false,
        message: "嗜好プロファイルがまだ作成されていません",
      });
    }

    return NextResponse.json({
      exists: true,
      profile: {
        favoriteIngredients: profile.favoriteIngredients,
        dislikedIngredients: profile.dislikedIngredients,
        ingredientScores: profile.ingredientScores,
        favoriteDishes: profile.favoriteDishes,
        dislikedDishes: profile.dislikedDishes,
        dishScores: profile.dishScores,
        favoriteMethods: profile.favoriteMethods,
        dislikedMethods: profile.dislikedMethods,
        methodScores: profile.methodScores,
      },
    });
  } catch (error) {
    console.error("[TasteAggregate] GET Error:", error);
    return NextResponse.json(
      { error: "嗜好プロファイルの取得に失敗しました" },
      { status: 500 }
    );
  }
}
