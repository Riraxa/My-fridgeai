// app/api/recommend/today/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export const maxDuration = 60;

// キャッシュ機構 - 食材が同じならAI呼び出しを省略
interface CacheEntry {
  recommendation: {
    title: string;
    reason: string;
    missingIngredients: string[];
    usedIngredients: string[];
    cookingTimeMinutes: number;
    difficulty: "簡単" | "普通" | "難しい";
  };
  timestamp: number;
}

const recommendationCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1時間

function generateCacheKey(
  ingredients: { id: string; name: string; amount: number | null; unit: string | null; expirationDate: Date | null }[]
): string {
  return ingredients
    .map(i => i.id)
    .sort()
    .join(',');
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // 1. Get user's ingredients
    const ingredients = await prisma.ingredient.findMany({
      where: { userId },
      orderBy: { expirationDate: "asc" },
    });

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json({
        recommendation: null,
        message: "食材が登録されていません。",
      });
    }

    // 2. Check cache
    const cacheKey = generateCacheKey(ingredients);
    const cached = recommendationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`[RecommendToday] Cache hit for user ${userId}`);
      return NextResponse.json({
        recommendation: cached.recommendation,
        fromCache: true,
      });
    }

    // 3. AI Generation
    const prompt = `
あなたは家庭の優秀なAIシェフです。
以下の冷蔵庫の在庫を元に、**今日一番作るべきオススメの献立**を1つだけ提案してください。

【冷蔵庫の在庫（期限が近い順）】
${ingredients
  .map(
    (i) =>
      `- ${i.name}: ${i.amount || ""}${i.unit || ""} (期限: ${
        i.expirationDate ? new Date(i.expirationDate).toLocaleDateString() : "不明"
      })`
  )
  .join("\n")}

【ルール】
- 期限間近の食材を優先的に消費すること
- 実用的な家庭料理であること
`;

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      system: "あなたはプロのAI料理提案アシスタントです。JSONで返答します。",
      prompt,
      schema: z.object({
        title: z.string().describe("献立の名前"),
        reason: z.string().describe("なぜこのメニューが今日最適なのかの理由"),
        missingIngredients: z.array(z.string()).describe("不足していて買う必要がある食材"),
        usedIngredients: z.array(z.string()).describe("在庫から使用する食材"),
        cookingTimeMinutes: z.number().describe("推定調理時間（分）"),
        difficulty: z.enum(["簡単", "普通", "難しい"]).describe("難易度"),
      }),
    });

    // Save to cache
    recommendationCache.set(cacheKey, {
      recommendation: object,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      recommendation: object,
      fromCache: false,
    });
  } catch (error: any) {
    console.error("[RecommendToday] Error:", error);
    return NextResponse.json(
      { error: "おすすめ献立の取得に失敗しました" },
      { status: 500 }
    );
  }
}
