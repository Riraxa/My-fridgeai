// app/api/menu/stream/route.ts
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkUserLimit } from "@/lib/aiLimit";
import { finalizeMenuGeneration } from "@/lib/ai/menu-stream-handler";
import type { ConstraintMode } from "@/types";
import { NextResponse } from "next/server";

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
    let { servings, budget, mode } = body;

    // 1. 回数制限チェック (Readonly)
    const limitCheck = await checkUserLimit(userId, "AI_MENU", { readonly: true });
    if (!limitCheck.ok) {
      return NextResponse.json({ error: "1日の生成回数制限に達しました" }, { status: 429 });
    }

    // 2. ユーザープラン、在庫、設定の取得
    const [user, dbIngredients, allergies, restrictions, preferences] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }),
      prisma.ingredient.findMany({ where: { userId } }),
      prisma.userAllergy.findMany({ where: { userId } }),
      prisma.userRestriction.findMany({ where: { userId } }),
      prisma.userPreferences.findUnique({ where: { userId } }),
    ]);

    if (!dbIngredients || dbIngredients.length === 0) {
      return NextResponse.json(
        { error: "冷蔵庫に食材がありません。先に食材を追加してください。" },
        { status: 400 }
      );
    }

    const isPro = user?.plan === "PRO";
    
    // 3. オプションのバリデーション
    servings = servings || 1;
    budget = isPro ? (budget ?? null) : null;
    const constraintMode: ConstraintMode = mode ?? "flexible";

    // 3.5. キャッシュ用ハッシュの計算 (Prisma必須項目のため)
    const crypto = await import("crypto");
    const sortedIngredients = [...dbIngredients].sort((a, b) => a.id.localeCompare(b.id));
    const cachePayload = {
      ingredients: sortedIngredients.map((i) => ({
        id: i.id,
        amount: i.amount,
        amountLevel: i.amountLevel,
        expiry: i.expirationDate?.toISOString(),
      })),
      prefs: preferences?.tasteJson,
      servings,
      budget,
    };
    const requestHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(cachePayload))
      .digest("hex");
    
    // 4. 保留中のレコードを作成
    const generation = await prisma.menuGeneration.create({
      data: {
        userId,
        status: "pending",
        mainMenu: {} as any,
        alternativeA: {} as any,
        alternativeB: {} as any,
        nutritionInfo: {} as any,
        usedIngredients: {} as any,
        shoppingList: {} as any,
        servings,
        budget: budget ?? undefined,
        requestHash, // 必須項目
        generatedAt: new Date(),
      },
    });

    // 5. プロンプト生成
    const allergenList = allergies.map((a) => a.label ?? a.allergen).join(", ");
    const restrictionNote = restrictions.map((r) => `${r.type}${r.note ? `: ${r.note}` : ""}`).join("; ");
    const cookingSkill = preferences?.cookingSkill ?? "intermediate";

    const ingredientList = dbIngredients
      .map((i) => {
        let q = i.amount ? ` (${i.amount}${i.unit ?? ""})` : (i.amountLevel ? ` (${i.amountLevel})` : "");
        return `- ${i.name}${q}`;
      })
      .join("\n");

    const prompt = `あなたはプロの献立プランナーです。
冷蔵庫にある食材を最大限に活用し、実用的で美味しい家庭料理の献立を提案してください。

# CRITICAL SAFETY RULES
1. NEVER suggest recipes containing these allergens: ${allergenList || "None"}.
2. Adhere to these dietary restrictions: ${restrictionNote || "None"}.
3. ユーザーの料理スキル: ${cookingSkill}

# GENERATION SETTINGS
- Servings: ${servings} person(s)
- Budget Goal: ${budget ? `approx ${budget} yen` : "ignore cost"}

# 手持ち食材
${ingredientList}

# 出力ガイドライン
1. まず、今回の献立の狙いや工夫点（思考プロセス）を日本語で4つほど簡潔に箇条書きで述べてください。
2. 次に、それに基づいた献立データを以下のJSON形式で出力してください。

\`\`\`json
{
  "main": {
    "title": "献立名",
    "reason": "選定理由",
    "tags": ["和食", "使い切り"],
    "dishes": [{
      "type": "主菜",
      "name": "料理名",
      "cookingTime": 20,
      "difficulty": 2,
      "ingredients": [{"name": "食材名", "amount": 200, "unit": "g"}],
      "steps": ["手順1", "手順2"],
      "tips": "コツ"
    }]
  },
  "alternativeA": { /* 同様の形式 */ },
  "alternativeB": { /* 同様の形式 */ }
}
\`\`\`

重要: JSONは最後に出力し、必ず有効な形式にしてください。`;

    const result = streamText({
      model: openai("gpt-4o-mini"),
      prompt,
      onFinish: async (event) => {
        try {
          const jsonMatch = event.text.match(/```json\s*([\s\S]*?)\s*```/);
          const jsonStr = jsonMatch ? jsonMatch[1] : event.text.match(/\{[\s\S]*\}/)?.[0];
          
          if (jsonStr) {
            const parsed = JSON.parse(jsonStr);
            console.log(`[Stream] Finished. Finalizing generation ${generation.id}`);
            await finalizeMenuGeneration(generation.id, userId, parsed, dbIngredients, { servings, budget, mode: constraintMode });
          } else {
            throw new Error("JSON not found in AI response");
          }
        } catch (e) {
          console.error("[Stream] Finalization error:", e);
          await prisma.menuGeneration.update({
            where: { id: generation.id },
            data: { status: "failed" },
          }).catch(console.error);
        }
      },
    });

    return result.toTextStreamResponse({
      headers: {
        "x-menu-generation-id": generation.id,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("[Stream Menu] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
