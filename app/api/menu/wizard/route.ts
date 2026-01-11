// app/api/menu/wizard/route.ts
import { getToken } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import {
  callOpenAIOnce,
  extractTextFromResponse,
  extractJsonFromText,
} from "@/lib/openai";

/**
 * Wizard route (minimal tokens)
 * - single OpenAI call (preferHighQuality false by default)
 * - returns short menu candidates (title/time/difficulty/tips/usedItems)
 * - on OpenAI error -> deterministic fallback
 */

export async function POST(req: NextRequest) {
  try {
    // --- 🔒 認証チェック ---
    const token = await getToken({
      req: req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }
    const userId = token.sub as string;

    // --- ⚙️ レート制限 ---
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("host") ||
      "unknown";
    const rl = await rateLimit(`wizard:${ip}`, 60, 60);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "リクエストが多すぎます。しばらくしてからお試しください。" },
        { status: 429 },
      );
    }

    // --- 🛑 利用回数制限 (AI Limit) ---
    const limitParams = await import("@/lib/aiLimit").then((m) =>
      m.canUseAI(userId),
    );
    if (!limitParams.allowed) {
      return NextResponse.json(
        {
          error: limitParams.error,
          remaining: limitParams.remaining,
        },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const mealTypes = Array.isArray(body.mealTypes) ? body.mealTypes : ["主菜"];
    const servings = Math.max(1, Number(body.servings ?? 1));
    const usedFridgeItems = Array.isArray(body.usedFridgeItems)
      ? body.usedFridgeItems
      : [];
    const mode = body.mode === "omakase" ? "omakase" : "selected";
    const appetite = typeof body.appetite === "string" ? body.appetite : "普通";
    const preferHighQuality = !!body.highQuality; // optional flag from UI

    // --- 🕓 UsageHistory 保存 ---
    try {
      await prisma.usageHistory.create({
        data: {
          userId,
          action: "wizard_generate",
          meta: { at: new Date().toISOString() },
        } as any,
      });
    } catch (err) {
      console.warn("usageHistory 保存に失敗:", err);
    }

    // --- 👤 ユーザー情報取得 (Pro判定用) ---
    // canUseAIでもチェックしているが、最新のisProが必要なため取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPro: true },
    });
    // @ts-ignore
    const { getProFeatures } = await import("@/lib/proFeatures");
    const features = getProFeatures(user?.isPro ?? false);

    const briefItemList = usedFridgeItems.length
      ? usedFridgeItems.join(", ")
      : "なし";

    const modeInstruction =
      mode === "omakase"
        ? `おまかせ: 登録済み食材（${briefItemList}）を優先して使用してください。`
        : `指定: 次の食材（${briefItemList}）を必ず使用してください（他は使用しないでください）。`;

    // Pro: 期限優先ロジックなどはWizardでは簡易版のため省略（プロンプトが複雑になるため）
    // ただし、AutoShoppingListはこのあと計算する

    // Minimal prompt: ask for 3 short candidates (title + usedItems)
    const prompt = `
あなたは家庭料理のプロです。以下の条件で **最大3件** の献立候補を短く作ってください。
出力は**純粋なJSON配列**のみ（余分な説明は一切禁止）。

条件:
- ${modeInstruction}
- 料理タイプ: ${mealTypes.join(", ")}
- 人数: ${servings}人分
- 食欲: ${appetite}

各要素はこの形にしてください（例）:
[
  {
    "title": "○○の炒め物",
    "time": "約20分",
    "difficulty": "低",
    "tips": "短いコツ",
    "ingredients": ["材料1", "材料2"],
    "usedItems": ["冷蔵庫内で使う食材(必須)"]
  }
]
`;

    try {
      const resp = await callOpenAIOnce(
        {
          input: prompt,
          preferHighQuality: preferHighQuality, // default false
          max_output_tokens: 500,
          temperature: 0.15,
        },
        15_000,
      );

      const raw = extractTextFromResponse(resp) ?? "";
      console.log("[wizard] raw preview:", raw?.slice?.(0, 800) ?? "");

      // Try to extract JSON
      let menus: any[] = [];
      const jsonText = extractJsonFromText(raw);
      if (jsonText) {
        try {
          const parsed = JSON.parse(jsonText);
          if (Array.isArray(parsed)) menus = parsed;
        } catch (e) {
          // parse fail -> keep menus empty and fallback below
        }
      } else {
        // quick attempt: whole raw is array
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) menus = parsed;
        } catch {}
      }

      if (!menus || menus.length === 0) {
        // fallback deterministic
        const fallback = fallbackGeneratedMenus(
          usedFridgeItems,
          mealTypes,
          servings,
        );
        return NextResponse.json({ menus: fallback, raw, fallback: true });
      }

      // normalize
      menus = menus.map((m: any) => ({
        title: typeof m.title === "string" ? m.title : "料理",
        time: typeof m.time === "string" ? m.time : "約30分",
        difficulty: ["低", "中", "高"].includes(m.difficulty)
          ? m.difficulty
          : "中",
        tips: typeof m.tips === "string" ? m.tips : "",
        ingredients: Array.isArray(m.ingredients) ? m.ingredients : [],
        usedItems: Array.isArray(m.usedItems) ? m.usedItems : [],
      }));

      // --- 🛒 Pro特典: 自動買い物リスト追加 (Auto Shopping List) ---
      let missingIngredients: string[] | undefined;

      if (features.autoShoppingList && menus.length > 0) {
        try {
          // 全ユーザー食材を取得（比較用）
          const allUserIngredients = await prisma.ingredient.findMany({
            where: { userId },
            select: { name: true },
          });
          const userItemNames = new Set(allUserIngredients.map((i) => i.name));

          // 今回生成された全献立の材料を収集
          const suggestedIngredients = new Set<string>();
          menus.forEach((m) => {
            if (Array.isArray(m.ingredients)) {
              m.ingredients.forEach((ing: any) => {
                if (typeof ing === "string") suggestedIngredients.add(ing);
              });
            }
          });

          // 不足分を特定 (単純な名前一致)
          const missing: string[] = [];
          for (const sugg of suggestedIngredients) {
            if (!userItemNames.has(sugg)) {
              missing.push(sugg);
            }
          }

          if (missing.length > 0) {
            missingIngredients = missing;
            console.log(
              `[AutoShoppingList] Found ${missing.length} missing items for user ${userId}`,
            );
          }
        } catch (err) {
          console.warn("Auto shopping list calculation failed:", err);
        }
      }

      return NextResponse.json({
        menus,
        raw,
        fallback: false,
        missingIngredients,
      });
    } catch (err: any) {
      console.warn("wizard: OpenAI call error:", err);
      // immediate fallback — do not retry
      const fallback = fallbackGeneratedMenus(
        usedFridgeItems,
        mealTypes,
        servings,
      );
      return NextResponse.json({
        menus: fallback,
        raw: null,
        fallback: true,
        details: err?.message ?? String(err),
      });
    }
  } catch (err: any) {
    console.error("wizard route fatal:", err);
    return NextResponse.json(
      { error: "献立生成に失敗しました", details: err?.message ?? String(err) },
      { status: 500 },
    );
  }
}

function fallbackGeneratedMenus(
  usedFridgeItems: string[],
  mealTypes: string[],
  servings: number,
) {
  const items = usedFridgeItems.length
    ? usedFridgeItems
    : ["卵", "野菜", "ごはん"];
  const titles: string[] = [];
  for (let i = 0; i < Math.min(3, items.length); i++) {
    const t = `${items[i]}の${mealTypes[i % mealTypes.length] ?? "料理"}`;
    titles.push(t);
  }
  if (!titles.length) titles.push("簡単おまかせ料理");

  return titles.map((t, idx) => ({
    title: t,
    time: "約20分",
    difficulty: "低",
    tips: "簡易レシピ（AIが使えない場合の代替）",
    ingredients: items.slice(0, 3),
    usedItems: items.slice(0, 1),
  }));
}
