// app/api/getRecipeDetail/route.ts
import { NextResponse } from "next/server";
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * getRecipeDetail (single-call)
 * - Uses gpt-4o-mini for all users (fast and capable for single recipes)
 * - Returns normalized recipe object for frontend
 */

export async function POST(req: Request) {
  try {
    // 1. Authentication & Plan Check
    const session = await auth();
    const userId = session?.user?.id;

    let isPro = false;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
      });
      isPro = user?.plan === "PRO";
    }

    const bodyRaw = await req.json().catch(() => ({}));
    const title = typeof bodyRaw.title === "string" ? bodyRaw.title : "";
    const fridgeItems = Array.isArray(bodyRaw.fridgeItems)
      ? bodyRaw.fridgeItems
      : [];
    const itemsToUse = Array.isArray(bodyRaw.itemsToUse)
      ? bodyRaw.itemsToUse
      : [];
    // 軽量献立から渡される詳細な食材情報
    const ingredients = Array.isArray(bodyRaw.ingredients)
      ? bodyRaw.ingredients
      : [];
    const description = typeof bodyRaw.description === "string" ? bodyRaw.description : "";
    const cookingTime = Number(bodyRaw.cookingTime) || 20;
    const difficulty = Number(bodyRaw.difficulty) || 2;
    const allowAny = !!bodyRaw.allowAny || bodyRaw.mode === "omakase";
    const servings = Math.max(1, Number(bodyRaw.servings ?? 1));

    if (!title) {
      return NextResponse.json(
        { error: "タイトルが指定されていません。" },
        { status: 400 },
      );
    }

    const fridgeText = fridgeItems.length ? fridgeItems.join(", ") : "なし";
    const mustUseText = itemsToUse.length ? itemsToUse.join(", ") : "なし";
    const modeInstruction = allowAny
      ? `おまかせ: 登録済み食材（${fridgeText}）を優先して使用してください。`
      : `指定: 以下の必須食材（${mustUseText}）を必ず使用してください。`;

    // ingredientsがある場合はそれを使用（分量を厳守させる）
    const ingredientsText = ingredients.length
      ? ingredients.map((ing: any) =>
        `- ${ing.name}: 合計 ${ing.amount}${ing.unit || 'g'}（${servings}人分合計）`.trim()
      ).join("\n")
      : null;

    const ingredientSection = ingredientsText
      ? `## 使用食材リスト（以下の分量を${servings}人分の合計として厳守してください）\n${ingredientsText}\n`
      : ``;

    const descriptionSection = description
      ? `## 料理の説明・コンセプト\n${description}\n`
      : ``;

    // 強化されたプロンプト
    const prompt = `
あなたは一流のプロ料理人です。次の条件に従って、"${title}" の**詳細で再現性の高いJSONレシピ**を1つ返してください。

# 条件
- ${modeInstruction}
- 人数: ${servings}人分
${ingredientSection}${descriptionSection}
- 目標調理時間: ${cookingTime}分以内
- 難易度目標: ${difficulty === 1 ? '低（初心者向け）' : difficulty === 2 ? '中（一般的）' : '高（こだわり）'}

# 出力ルール
- **食材の分量整合性**: 
  - 上記「使用食材リスト」に記載された分量は、${servings}人分の『合計量』です。
  - JSON内の "ingredients" 配列では、必ず「1人分あたりの分量 (quantity_per_serving)」を計算して数値で入力してください。
  - "total_quantity" は quantity_per_serving × ${servings} と一致させてください。
- **調理手順 (steps)**: 
  - 3点程度の簡略すぎる手順は厳禁です。プロの視点で、美味しく作るための具体的な工程を5〜10ステップで記述してください。
  - ステップ内に目安時間を括弧で示してください（例: "玉ねぎを飴色になるまで中火で炒める（約8分）"）。
- **タイマー (timers)**: 
  - 手順の中で時間を計る必要があるステップには必ずタイマーを設定してください。
- **コツ (tips)**: 
  - 料理の質を一段上げるプロのアドバイスを3つ以上記述してください。

# JSON構成案
{
  "title": "${title}",
  "servings": ${servings},
  "time_minutes": 数値,
  "difficulty": "低" | "中" | "高",
  "ingredients": [
    {
      "name": "食材名",
      "quantity_per_serving": 1人分の数値,
      "unit": "単位",
      "total_quantity": 合計数値,
      "optional": boolean
    }
  ],
  "steps": ["手順1（約x分）", "手順2（約y分）", ...],
  "timers": [{"step": 0, "seconds": 300, "label": "手順1のタイマー"}],
  "tips": ["プロのコツ1", "プロのコツ2", "プロのコツ3"],
  "grocery_additions": ["足りない場合に買い足すべき食材名"]
}
`;

    try {
      // AI SDK 6: Structured Outputで型安全にレシピ生成
      const RecipeSchema = z.object({
        title: z.string(),
        servings: z.number(),
        time_minutes: z.number(),
        difficulty: z.enum(['低', '中', '高']),
        ingredients: z.array(z.object({
          name: z.string(),
          quantity_per_serving: z.number(),
          unit: z.string(),
          total_quantity: z.number(),
          optional: z.boolean(),
        })),
        steps: z.array(z.string()),
        timers: z.array(z.object({
          step: z.number(),
          seconds: z.number(),
          label: z.string(),
        })).optional(),
        tips: z.array(z.string()).optional(),
        grocery_additions: z.array(z.string()).optional(),
        nutrition_estimate: z.object({}).passthrough().optional(),
      });

      const { object: parsed } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: RecipeSchema,
        prompt,
        temperature: 0.3, // 創造性を少し高めて画一的な手順を避ける
        maxOutputTokens: 2500, 
      });

      console.log("[getRecipeDetail] generated successfully");

      const recipe = normalizeParsedRecipe(parsed, title, servings, JSON.stringify(parsed));
      return NextResponse.json({ recipe, raw: JSON.stringify(parsed), fallback: false });
    } catch (err: any) {
      console.warn(
        "getRecipeDetail: OpenAI call failed or validation failed. Falling back.",
        err?.status ?? err?.message ?? err,
      );

      // AIが失敗した場合の高品質なフォールバック
      const fallback = makeFallbackRecipe(
        title,
        servings,
        ingredients.length > 0 ? ingredients : itemsToUse.map((name: string) => ({ name, amount: 1, unit: "個" })),
        description
      );

      const details = err?.raw ?? err?.message ?? String(err);
      return NextResponse.json(
        { recipe: fallback, fallback: true, details },
        { status: 200 },
      );
    }
  } catch (err: any) {
    console.error("getRecipeDetail fatal error:", err);
    return NextResponse.json(
      {
        error: "レシピ生成中に致命的なエラーが発生しました",
        details: err?.message ?? String(err),
      },
      { status: 500 },
    );
  }
}

/** 
 * 高品質なフォールバックレシピ生成
 * AIが利用できない場合でも、可能な限り入力された材料を反映させる
 */
function makeFallbackRecipe(
  title: string,
  servings: number,
  ingredients: any[],
  description: string,
) {
  return {
    title: title || "簡易レシピ",
    description: description || "AIが一時的に利用できないため、標準的な手順で構成しました。",
    servings,
    time_minutes: 20,
    difficulty: "低",
    ingredients: ingredients.map((ing: any) => ({
      name: ing.name,
      quantity_per_serving: (Number(ing.amount) || 1) / servings,
      unit: ing.unit || "個",
      total_quantity: Number(ing.amount) || servings,
      optional: false,
      notes: "",
    })),
    steps: [
      "材料をすべて計量し、下準備を整える（約5分）",
      "食材を火の通りにくいものから順に適切に切り分ける（約5分）",
      "熱したフライパンまたは鍋で、具材を丁寧に炒め合わせる（約5分）",
      "全体の味を確認しながら、調味料で好みの味に整える（約2分）",
      "器に美しく盛り付け、熱いうちにお召し上がりください（約3分）",
    ],
    timers: [{ step: 2, seconds: 300, label: "加熱調理" }],
    tips: [
      "強火で一気に仕上げることで、食材の食感を活かすことができます。",
      "味付けは薄めから始め、最後に調整するのが美味しく作るコツです。",
      "盛り付けの際に彩りを意識すると、より食欲をそそる仕上がりになります。"
    ],
    pitfalls: ["焦がさないよう、火加減に注意してください。"],
    storage: "冷蔵保存で1〜2日以内にお召し上がりください。",
    allergy_warnings: [],
    grocery_additions: [],
    nutrition_estimate: {},
  };
}

function toNumberOrUndefined(v: any): number | undefined {
  const n = Number(v);
  if (Number.isFinite(n)) return n;
  return undefined;
}

function deriveTimersFromSteps(steps: any): any[] {
  try {
    if (!Array.isArray(steps)) return [];
    const timers: any[] = [];
    for (let i = 0; i < steps.length; i++) {
      const s = String(steps[i] ?? "");
      const m = s.match(/約?(\d+)\s*分/);
      if (m) {
        const minutes = Number(m[1]);
        timers.push({
          step: i,
          seconds: minutes * 60,
          label: s.replace(/（.*?）/g, "").slice(0, 60),
        });
      }
    }
    return timers;
  } catch {
    return [];
  }
}

function normalizeParsedRecipe(
  parsed: any,
  fallbackTitle: string,
  fallbackServings: number,
  raw: string,
) {
  const title = typeof parsed.title === "string" ? parsed.title : fallbackTitle;
  const servings = Number(parsed.servings ?? fallbackServings ?? 1);
  const time_minutes = Number(parsed.time_minutes ?? parsed.time ?? 30) || 30;
  const difficulty = ["低", "中", "高"].includes(parsed.difficulty)
    ? parsed.difficulty
    : (parsed.difficulty ?? "中");

  const ingredients = Array.isArray(parsed.ingredients)
    ? parsed.ingredients.map((ing: any) => {
      const name = String(ing?.name ?? ing ?? "").trim();
      const qps = toNumberOrUndefined(
        ing?.quantity_per_serving ?? ing?.qps ?? ing?.quantityPerServing,
      );
      const unit = String(ing?.unit ?? "個");
      const total = toNumberOrUndefined(
        ing?.total_quantity ??
        ing?.totalQuantity ??
        (qps !== undefined ? qps * servings : undefined),
      );
      return {
        name,
        quantity_per_serving: qps ?? 0,
        unit,
        total_quantity: total ?? (qps ? qps * servings : 0),
        optional: !!ing?.optional,
        substitutes: Array.isArray(ing?.substitutes)
          ? ing.substitutes.map(String)
          : [],
        notes: ing?.notes ?? "",
      };
    })
    : [];

  const steps = Array.isArray(parsed.steps) ? parsed.steps.map(String) : [];
  const timers = Array.isArray(parsed.timers)
    ? parsed.timers
    : deriveTimersFromSteps(steps);

  const tips = Array.isArray(parsed.tips)
    ? parsed.tips
    : parsed.tips
      ? [String(parsed.tips)]
      : [];
  const pitfalls = Array.isArray(parsed.pitfalls)
    ? parsed.pitfalls
    : parsed.pitfalls
      ? [String(parsed.pitfalls)]
      : [];
  const storage = parsed.storage ?? "";
  const allergy_warnings = Array.isArray(parsed.allergy_warnings)
    ? parsed.allergy_warnings
    : parsed.allergy_warnings
      ? [String(parsed.allergy_warnings)]
      : [];
  const grocery_additions = Array.isArray(parsed.grocery_additions)
    ? parsed.grocery_additions
    : parsed.grocery_additions
      ? [String(parsed.grocery_additions)]
      : [];
  const nutrition_estimate = parsed.nutrition_estimate ?? {};

  return {
    title,
    description: parsed.description ?? "",
    servings,
    time_minutes,
    difficulty,
    ingredients,
    steps,
    timers,
    tips,
    pitfalls,
    storage,
    allergy_warnings,
    grocery_additions,
    nutrition_estimate,
    raw,
  };
}
