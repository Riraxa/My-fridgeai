import { NextResponse } from "next/server";
import { fuzzySearchFood } from "@/lib/expiration-rules";
import { addDays } from "date-fns";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Using explicitly casted prisma to avoid temporary TS errors after generation
const db = prisma as any;

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { items, purchasedAt } = await req.json();
    const purchaseDate = purchasedAt ? new Date(purchasedAt) : new Date();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: true, results: [] });
    }

    const results: any[] = new Array(items.length);
    const aiCandidates: { name: string, originalIndex: number }[] = [];

    // 1. Process local rules & global cache first (Costs 0)
    for (let i = 0; i < items.length; i++) {
      const name = items[i];
      const match = fuzzySearchFood(name);

      if (match) {
        results[i] = {
          name,
          estimatedExpiration: addDays(purchaseDate, match.days),
          estimatedCategory: match.category,
          estimatedAmount: match.defaultAmount,
          estimatedUnit: match.defaultUnit,
          confidence: "high",
          source: "database",
        };
        continue;
      }

      try {
        const cached = await db.estimatedIngredientCache.findUnique({
          where: { name: name.trim() }
        });

        if (cached) {
          const aiDate = new Date(purchaseDate);
          aiDate.setDate(aiDate.getDate() + cached.days);
          results[i] = {
            name,
            estimatedExpiration: aiDate,
            estimatedCategory: cached.category,
            estimatedAmount: cached.amount,
            estimatedUnit: cached.unit,
            confidence: "high",
            source: "ai_cache",
          };
          continue;
        }
      } catch {
        // Ignore cache lookup errors
      }

      aiCandidates.push({ name: name.trim(), originalIndex: i });
    }

    // 2. Batch AI request for non-cached items (1 API Call instead of N calls)
    if (aiCandidates.length > 0) {
      const prompt = `
以下の複数の食材の一般的な賞味期限（冷蔵保存）、適切なカテゴリ、および標準的な購入単位での数量を推定してください。

【カテゴリ分類】: 冷蔵, 冷凍, 野菜, 調味料, 加工食品, その他 のいずれか
【数量ルール】: 日本のスーパーで実際に売られている標準パッケージサイズ（例: 豆腐は1丁(350g), キャベツは1玉(1000g), 牛肉は300g等）

以下のJSONオブジェクト形式のみで返してください:
{
  "estimations": [
    {
      "name": "入力された食材名",
      "days": 7, 
      "category": "冷蔵", 
      "amount": 300, 
      "unit": "g"
    }
  ]
}

対象の食材リスト:
${aiCandidates.map(c => `- ${c.name}`).join('\n')}
`;

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.1,
        });

        const content = completion.choices[0]?.message.content;
        if (content) {
          const parsed = JSON.parse(content);
          const estimations = parsed.estimations || [];

          for (const est of estimations) {
            const candidate = aiCandidates.find(c => c.name === est.name);
            if (!candidate) continue;

            const days = est.days || 7;
            const aiDate = new Date(purchaseDate);
            aiDate.setDate(aiDate.getDate() + days);

            results[candidate.originalIndex] = {
              name: est.name,
              estimatedExpiration: aiDate,
              estimatedCategory: est.category || "冷蔵",
              estimatedAmount: est.amount,
              estimatedUnit: est.unit,
              confidence: "medium",
              source: "ai",
            };

            // Async Global Cache Save
            try {
              db.estimatedIngredientCache.upsert({
                where: { name: est.name },
                update: {},
                create: {
                  name: est.name,
                  category: est.category || "冷蔵",
                  amount: est.amount || null,
                  unit: est.unit || null,
                  days: days,
                  confidence: "ai_cache"
                }
              }).catch(() => {});
            } catch {
              // Ignore save errors
            }
          }
        }
      } catch (aiError) {
        console.error("Bulk AI Estimation failed:", aiError);
      }
    }

    // 3. Fallback for any failed items
    for (let i = 0; i < items.length; i++) {
      if (!results[i]) {
        results[i] = {
          name: items[i],
          estimatedExpiration: addDays(purchaseDate, 7),
          estimatedCategory: "冷蔵",
          source: "default",
        };
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });

  } catch (error) {
    console.error("Bulk Estimation Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
