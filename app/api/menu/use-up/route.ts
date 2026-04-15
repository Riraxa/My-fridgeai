// app/api/menu/use-up/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // 期限の近い順で食材を取得
    const ingredients = await prisma.ingredient.findMany({
      where: { userId },
      orderBy: { expirationDate: "asc" },
    });

    const profile = await prisma.userTasteProfile.findUnique({
      where: { userId },
    });

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json({
        recommendation: null,
        message: "食材がありません。",
      });
    }

    // 賞味期限が3日以内の食材を抽出
    const now = new Date().getTime();
    const expiringIngredients = ingredients.filter(i => {
      if (!i.expirationDate) return false;
      return new Date(i.expirationDate).getTime() - now < 1000 * 60 * 60 * 24 * 3;
    });

    const targetList = expiringIngredients.length > 0 ? expiringIngredients : ingredients.slice(0, 5);

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      system: "あなたは賞味期限間近の食材を無駄なく使い切る「フードロスゼロ」の達人シェフです。JSON形式で返答します。",
      prompt: `
以下の「優先して消費すべき食材リスト（期限切れ間近）」を**すべて**、または**可能な限り多く**使用して、
美味しい1品のレシピを提案してください。

【優先消費食材】
${targetList.map(i => `- ${i.name}: ${i.amount || ""}${i.unit || ""}`).join("\n")}

【その他の在庫食材（味の補強などに使用可）】
${ingredients.filter(i => !targetList.find(t => t.id === i.id)).map(i => `- ${i.name}`).join(", ") || "なし"}

【ユーザーの好み】
- 好きな食材: ${(profile?.favoriteIngredients ?? []).join(", ")}
- 苦手な食材: ${(profile?.dislikedIngredients ?? []).join(", ")}

【ルール】
- 優先食材をごまかしなく主役級、またはしっかりと消費できる形にすること
- 実用的な日本の家庭料理であること
`,
      schema: z.object({
        title: z.string().describe("献立の名前"),
        reason: z.string().describe("どの期限切れ食材をどうやって美味しく救済したかの理由"),
        mainUsedIngredients: z.array(z.string()).describe("優先して消費した食材のリスト"),
        otherUsedIngredients: z.array(z.string()).describe("味の補強などで使ったその他の在庫食材"),
        cookingTimeMinutes: z.number().describe("推定調理時間（分）"),
        difficulty: z.string().describe("難易度"),
        steps: z.array(z.string()).describe("簡潔な調理ステップ（3〜8ステップ程度）"),
      }),
    });

    return NextResponse.json({
      recommendation: object,
    });
  } catch (error: any) {
    console.error("[UseUpMenu] Error:", error);
    return NextResponse.json(
      { error: "使い切り献立の取得に失敗しました" },
      { status: 500 }
    );
  }
}
