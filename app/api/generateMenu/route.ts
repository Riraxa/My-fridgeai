// app/api/generateMenu/route.ts
import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { callOpenAIOnce, extractTextFromResponse } from "@/lib/openai";
import { rateLimit } from "@/lib/rateLimiter";
import { getProFeatures } from "@/lib/proFeatures";

export async function POST(request: NextRequest) {
  try {
    // --- 🔒 認証チェック ---
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }
    const userId = token.sub as string;

    // --- ⚙️ レート制限 ---
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("host") ||
      "unknown";
    const rl = await rateLimit(`generate:${ip}`, 60, 60);
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

    // --- 📦 リクエスト Body ---
    const body = await request.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? body.items : [];
    const prefs = (body.preferences ?? {}) as any;

    if (!items.length) {
      return NextResponse.json({ error: "食材が必要です。" }, { status: 400 });
    }

    // --- 🕓 UsageHistory 保存 ---
    try {
      await prisma.usageHistory.create({
        data: {
          userId,
          action: "generate",
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
    const features = getProFeatures(user?.isPro ?? false);

    // --- 🥕 消費期限チェック (Pro特典) ---
    // string[] の items を受け取り、DBにあるexpiry情報と紐付ける
    let ingredientText = items.join(", ");

    if (features.prioritizeExpiry) {
      // 名前が一致する食材をDBから取得して期限を確認
      try {
        const dbIngredients = await prisma.ingredient.findMany({
          where: {
            userId,
            name: { in: items },
            expiry: { not: null },
          },
          select: { name: true, expiry: true },
        });

        // 期限付きの文字列に変換
        // 例: "鶏肉(期限: 2025/12/31), 玉ねぎ"
        const formattedItems = items.map((itemName: string) => {
          const match = dbIngredients.find((db) => db.name === itemName);
          if (match && match.expiry) {
            const dateStr = match.expiry.toISOString().split("T")[0];
            return `${itemName}(期限: ${dateStr})`;
          }
          return itemName;
        });
        ingredientText = formattedItems.join(", ");
      } catch (e) {
        console.warn("Expiry check failed:", e);
      }
    }

    // --- 🧠 OpenAI プロンプト作成 ---
    const promptParts: string[] = [
      `あなたは一流の料理研究家です。以下の食材を使って家庭で作れる献立を考えてください。`,
      `持っている食材: ${ingredientText}`,
    ];

    // --- ✨ Pro特典: 期限優先 & 栄養バランス ---
    if (features.prioritizeExpiry) {
      promptParts.push(
        `重要: 期限が近い食材（カッコ内に日付があるもの）を優先的に使い切るレシピを提案してください。`,
      );
    }
    if (features.nutritionBalance) {
      promptParts.push(
        `重要: タンパク質・脂質・炭水化物のバランス（PFCバランス）が良い献立を意識してください。`,
      );
    }

    if (prefs.servings) promptParts.push(`人数: ${prefs.servings}人分`);
    if (prefs.appetite) promptParts.push(`食欲レベル: ${prefs.appetite}`);
    if (prefs.meal_parts && Array.isArray(prefs.meal_parts)) {
      promptParts.push(`希望の構成: ${prefs.meal_parts.join(", ")}`);
    }

    promptParts.push(`
以下の形式のJSON配列のみを出力してください。説明文は不要です。
[
  {
    "title": "鶏の照り焼き",
    "time": "25分",
    "difficulty": "中",
    "tips": "タレは焦げやすいので注意",
    "ingredients": ["鶏もも肉", "醤油", "みりん", "砂糖"],
    "steps": [
      "鶏もも肉を一口大に切る",
      "フライパンで皮目から焼く",
      "タレを加えて煮詰める"
    ],
    "cautions": ["強火で焼きすぎない", "タレを焦がさない"]
  }
]
各献立は最大3件まで。
`);

    const prompt = promptParts.join("\n");

    // --- 🚀 OpenAI 呼び出し ---
    const resp = await callOpenAIOnce(
      { model: "gpt-4o-mini", input: prompt, max_output_tokens: 1000 },
      25000,
    );

    // --- 🧩 JSON 抽出 ---
    const raw = extractTextFromResponse(resp);
    let menus: any[] = [];

    try {
      const first = raw.indexOf("[");
      const last = raw.lastIndexOf("]");
      if (first >= 0 && last >= 0) {
        menus = JSON.parse(raw.slice(first, last + 1));
      } else {
        console.warn("generateMenu: JSON配列が見つかりません:", raw);
      }
    } catch (err) {
      console.warn("generateMenu: JSON parse error:", err, raw);
    }

    // --- 🔧 バリデーション & デフォルト値 ---
    menus = menus.map((m) => ({
      title: m.title ?? "不明な料理",
      time: m.time ?? "約30分",
      difficulty: ["低", "中", "高"].includes(m.difficulty)
        ? m.difficulty
        : "中",
      tips: m.tips ?? "特に注意点はありません。",
      ingredients: Array.isArray(m.ingredients) ? m.ingredients : [],
      steps: Array.isArray(m.steps) ? m.steps : ["手順情報が見つかりません。"],
      cautions: Array.isArray(m.cautions) ? m.cautions : [],
    }));

    // --- 🧾 DB 保存（Menu）---
    for (const m of menus) {
      try {
        await prisma.menu.create({
          data: {
            userId,
            title: m.title,
            difficulty: m.difficulty,
            time: m.time,
            tips: m.tips,
            ingredients: m.ingredients,
          } as any,
        });
      } catch (err) {
        console.warn("menu 保存に失敗:", err);
      }
    }

    // --- 🛒 Pro特典: 自動買い物リスト追加 ---
    // 献立で提案されたが、ユーザーが持っていないと思われる食材をリストに追加
    // ※DBには即時追加せず、レスポンスに含めてフロントエンドで確認する
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

    // --- 🎉 完了レスポンス ---
    return NextResponse.json({ menus, missingIngredients });
  } catch (err: any) {
    console.error("generateMenu error:", err);
    return NextResponse.json(
      { error: "献立の生成中にエラーが発生しました。" },
      { status: 500 },
    );
  }
}
