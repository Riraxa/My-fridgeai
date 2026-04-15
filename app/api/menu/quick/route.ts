// app/api/menu/quick/route.ts
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

    // 15分以内のレシピを優先するため、ユーザーの現在庫を取得
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

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      system: "あなたは超時短料理・即決メニューのプロです。JSON形式で返答します。",
      prompt: `
ユーザーは「今すぐ、悩まずに、最速で作れるごはん」を求めています。
以下の冷蔵庫の在庫から、**調理時間15分以内で作れる1品（または1汁1菜）のメニュー**を1つだけ提案してください。

【冷蔵庫の在庫】
${ingredients.map(i => `- ${i.name}: ${i.amount || ""}${i.unit || ""}`).join("\n")}

【ユーザーの好み】
- 好きな食材: ${(profile?.favoriteIngredients ?? []).join(", ")}
- 苦手な食材: ${(profile?.dislikedIngredients ?? []).join(", ")}

【ルール】
- とにかく調理のステップを物理的に短くできるもの
- 在庫の食材だけで完結すること（どうしても必要な調味料は暗黙で利用可）
- 電子レンジ調理やワンパン料理を優先
`,
      schema: z.object({
        title: z.string().describe("献立の名前"),
        reason: z.string().describe("なぜこのメニューが最も早く作れるのかの理由"),
        usedIngredients: z.array(z.string()).describe("使用する食材のリスト"),
        cookingTimeMinutes: z.number().describe("推定調理時間（分）"),
        difficulty: z.string().describe("難易度（例: '超簡単'）"),
        steps: z.array(z.string()).describe("簡潔な調理ステップ（3〜5ステップ程度）"),
      }),
    });

    return NextResponse.json({
      recommendation: object,
    });
  } catch (error: any) {
    console.error("[QuickMenu] Error:", error);
    return NextResponse.json(
      { error: "クイック献立の取得に失敗しました" },
      { status: 500 }
    );
  }
}
