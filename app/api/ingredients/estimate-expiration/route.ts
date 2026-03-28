import { NextResponse } from "next/server";
import { fuzzySearchFood } from "@/lib/expiration-rules";
import { addDays } from "date-fns";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, purchasedAt } = await req.json();
    const purchaseDate = purchasedAt ? new Date(purchasedAt) : new Date();

    // 1. 高精度・爆速・低コスト判定（Fuzzy Search + USDA Database）
    const match = fuzzySearchFood(name);
    if (match) {
      const expirationDate = addDays(purchaseDate, match.days);
      return NextResponse.json({
        success: true,
        estimatedExpiration: expirationDate,
        estimatedCategory: match.category,
        estimatedAmount: match.defaultAmount,
        estimatedUnit: match.defaultUnit,
        confidence: "high",
        reasoning: `データベース検索により「${match.name}」として特定しました。`,
        source: "database",
      });
    }

    // 1.5. Check Global Cache
    try {
      const cached = await prisma.estimatedIngredientCache.findUnique({
        where: { name: name.trim() }
      });
      
      if (cached) {
        const aiDate = new Date(purchaseDate);
        aiDate.setDate(aiDate.getDate() + cached.days);
        
        console.log(`[Estimation Cache] HIT for ${name}`);
        return NextResponse.json({
          success: true,
          estimatedExpiration: aiDate,
          estimatedCategory: cached.category,
          estimatedAmount: cached.amount,
          estimatedUnit: cached.unit,
          confidence: "high", // 過去のAI結果なので信頼度を上げる
          reasoning: "過去のAI推論結果（キャッシュ）から特定しました。",
          source: "ai_cache",
        });
      }
    } catch (cacheError) {
      console.error("Cache lookup failed:", cacheError);
    }

    // 2. AI Estimation (Fallback: データベースにない場合のみ実行)
    const prompt = `
食材「${name}」の一般的な賞味期限（冷蔵保存）、適切なカテゴリ、および**標準的な購入単位での数量**を推定してください。
購入日は${purchaseDate.toISOString().split("T")[0]}です。

【重要】数量推定の精度が最優先です。以下のルールを厳守してください：

【カテゴリ分類】: 以下の中から最も適切なものを1つ選んでください。
  - 冷蔵: 生鮮食品（肉・魚）、乳製品、チルド惣菜。
  - 冷凍: 冷凍食品、アイス。
  - 野菜: 生野菜、果物、キノコ類。
  - 調味料: 醤油、味噌、塩、砂糖、油、マヨネーズ等の基礎調味料。
  - 加工食品: カレールーウ、レトルト、缶詰、ハム・ソーセージ、豆腐、納豆、乾麺、菓子。
  - その他: 飲料、日用品。

【数量・単位の推定ルール】★最重要
- **日本のスーパーで実際に売られている標準パッケージサイズを基準にしてください**
- 可能な限り「g」「ml」「個」などの標準単位を使用
- 具体的な商品例を想定して推定：
  - 例1: 豆腐 → 1丁(350g) 
  - 例2: 卵 → 1パック(10個)
  - 例3: 醤油 → 1本(1000ml)
  - 例4: ツナ缶 → 1缶(70g)
  - 例5: 鶏肉 → 1パック(400-500g)

【賞味期限の根拠】
- 生鮮食品: 2-5日
- 加工食品: 製造日から数ヶ月〜数年
- 缶詰: 3年程度
- 冷凍食品: 1年程度

回答は以下のJSON形式のみで返してください:
{
  "days": 7, 
  "category": "冷蔵", 
  "amount": 300, 
  "unit": "g", 
  "confidence": "medium", 
  "reasoning": "スーパーで一般的に販売されているパッケージサイズを基準に推定"
}
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = completion.choices[0]?.message.content;
      if (content) {
        const result = JSON.parse(content);
        const days = result.days || 7;
        const aiDate = new Date(purchaseDate);
        aiDate.setDate(aiDate.getDate() + days);

        // Save to cache asynchronously (fire-and-forget) to not block response
        try {
          prisma.estimatedIngredientCache.upsert({
            where: { name: name.trim() },
            update: {}, // Already cached
            create: {
              name: name.trim(),
              category: result.category || "冷蔵",
              amount: result.amount || null,
              unit: result.unit || null,
              days: days,
              confidence: "ai_cache"
            }
          }).catch((e: unknown) => console.error("Failed to save to estimation cache:", e));
        } catch (e: unknown) {
          // ignore sync errors
        }

        return NextResponse.json({
          success: true,
          estimatedExpiration: aiDate,
          estimatedCategory: result.category || "冷蔵",
          estimatedAmount: result.amount,
          estimatedUnit: result.unit,
          confidence: result.confidence || "medium",
          reasoning: result.reasoning || "",
          source: "ai",
        });
      }
    } catch (aiError) {
      console.error("AI Estimation failed:", aiError);
    }

    // 全ての推定が失敗した場合のデフォルト
    const defaultDate = addDays(purchaseDate, 7);
    return NextResponse.json({
      success: true,
      estimatedExpiration: defaultDate,
      estimatedCategory: "冷蔵",
      source: "default",
    });

  } catch (error) {
    console.error("Estimation Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
