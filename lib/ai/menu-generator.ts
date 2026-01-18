import OpenAI from "openai";
import { Ingredient, UserPreferences } from "@prisma/client";
import { differenceInDays } from "date-fns";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GeneratedMenu {
  title: string;
  reason: string;
  tags: string[];
  dishes: {
    type: string;
    name: string;
    cookingTime: number;
    difficulty: number;
    ingredients: {
      name: string;
      amount: number;
      unit: string;
    }[];
    steps: string[];
    tips: string;
  }[];
}

export interface MenuGenerationResult {
  main: GeneratedMenu;
  alternativeA: GeneratedMenu;
  alternativeB: GeneratedMenu;
}

/**
 * Generate 3 menu patterns using OpenAI
 */
export async function generateMenus(
  ingredients: Ingredient[],
  preferences: UserPreferences | null,
  expiringSoon: Ingredient[],
): Promise<MenuGenerationResult> {
  // Extract preferences with proper type handling
  // Note: key casting to any to bypass stale Prisma types in editor
  const criticalThreshold = (preferences as any)?.expirationCriticalDays ?? 2;
  const warningThreshold = (preferences as any)?.expirationWarningDays ?? 5;
  const priorityWeight = (preferences as any)?.expirationPriorityWeight ?? 0.7;

  // Filter ingredients by custom thresholds
  const critical = ingredients.filter((i) => {
    if (!i.expirationDate) return false;
    const days = differenceInDays(i.expirationDate, new Date());
    return days >= -2 && days <= criticalThreshold; // -2 to include slightly expired
  });

  const warning = ingredients.filter((i) => {
    if (!i.expirationDate) return false;
    const days = differenceInDays(i.expirationDate, new Date());
    return days > criticalThreshold && days <= warningThreshold;
  });

  // Format ingredients (general list)
  const ingredientList = ingredients
    .map((i) => {
      let quantity = "";
      if (i.amount) quantity = ` (${i.amount}${i.unit || ""})`;
      else if (i.amountLevel) quantity = ` (${i.amountLevel})`;

      let expiry = "";
      if (i.expirationDate) {
        const days = differenceInDays(i.expirationDate, new Date());
        expiry = ` [期限まで${days}日]`;
      }
      return `- ${i.name}${quantity}${expiry}`;
    })
    .join("\n");

  // Build Priority Lists
  const criticalList =
    critical.length > 0
      ? critical
          .map((i) => {
            const days = i.expirationDate
              ? differenceInDays(i.expirationDate, new Date())
              : 0;
            return `- ${i.name} (期限まで${days}日) ★最優先`;
          })
          .join("\n")
      : "なし";

  const warningList =
    warning.length > 0
      ? warning
          .map((i) => {
            const days = i.expirationDate
              ? differenceInDays(i.expirationDate, new Date())
              : 0;
            return `- ${i.name} (期限まで${days}日) ☆優先`;
          })
          .join("\n")
      : "なし";

  // Extract preferences with proper type handling
  const cookingSkill = preferences?.cookingSkill || "intermediate";
  const comfortableMethods = Array.isArray(preferences?.comfortableMethods)
    ? (preferences.comfortableMethods as string[]).join(", ")
    : "なし";
  const avoidMethods = Array.isArray(preferences?.avoidMethods)
    ? (preferences.avoidMethods as string[]).join(", ")
    : "なし";
  const equipment = Array.isArray(preferences?.kitchenEquipment)
    ? (preferences.kitchenEquipment as string[]).join(", ")
    : "標準的なキッチン（ガスコンロ、電子レンジ、フライパン、鍋）";

  const systemPrompt = `あなたはプロの献立プランナーです。
冷蔵庫にある食材を使って、実用的で美味しい家庭料理の献立を提案してください。

# 手持ち食材
${ingredientList}

# ⚠️ 最優先で使うべき食材（${criticalThreshold}日以内）
${criticalList}

# 優先的に使うべき食材（${warningThreshold}日以内）
${warningList}

優先度: ${Math.round(priorityWeight * 100)}% の確率でこれらの食材を使用してください。

# ユーザー情報
- 料理スキル: ${cookingSkill}
- 得意な調理法: ${comfortableMethods}
- 避けたい調理法: ${avoidMethods}
- 利用可能な設備: ${equipment}

# 重要な制約
1. **手持ちの食材を最大限活用すること**
   - できるだけ上記の食材を使う
   - 足りない調味料は基本調味料（醤油、塩、砂糖、酢、油など）のみ許可
   - 特殊な食材を追加で買わせない

2. **賞味期限の近い食材を優先的に使うこと**
   - 「優先的に使うべき食材」リストの食材を積極的に使う

3. **避けたい調理法は絶対に使わないこと**

# 提案する献立パターン（必ず3パターン）

**1. メイン提案**
- 最も栄養バランスが良く、賞味期限の近い食材を優先
- 定食スタイル（主菜・副菜・汁物の3品構成）
- 和食、洋食、中華のいずれか

**2. 代替案A（ジャンル違い）**
- メイン提案と異なるジャンル
  例: メインが和食なら → 洋食 or 中華
- 同じく3品構成

**3. 代替案B（時短重視）**
- 15分以内で完成する献立
- 1〜2品でもOK（丼ものなど）
- 手軽さ優先

# 出力形式（必ずこのJSON形式で）

{
  "main": {
    "title": "今日のおすすめ和定食",
    "reason": "鶏肉の賞味期限が明日なので優先的に使用。栄養バランスも良い献立です。",
    "tags": ["和食", "消費期限優先", "栄養バランス"],
    "dishes": [
      {
        "type": "主菜",
        "name": "鶏の照り焼き",
        "cookingTime": 20,
        "difficulty": 2,
        "ingredients": [
          {"name": "鶏もも肉", "amount": 200, "unit": "g"},
          {"name": "醤油", "amount": 2, "unit": "大さじ"},
          {"name": "みりん", "amount": 1, "unit": "大さじ"}
        ],
        "steps": [
          "鶏肉を一口大に切る",
          "フライパンで皮目から焼く",
          "醤油とみりんを加えて煮詰める"
        ],
        "tips": "皮目をパリッと焼くと美味しい"
      },
      {
        "type": "副菜",
        "name": "ほうれん草のおひたし",
        "cookingTime": 5,
        "difficulty": 1,
        "ingredients": [
          {"name": "ほうれん草", "amount": 100, "unit": "g"},
          {"name": "醤油", "amount": 1, "unit": "小さじ"}
        ],
        "steps": [
          "ほうれん草を茹でる",
          "水気を絞って醤油をかける"
        ],
        "tips": "茹ですぎに注意",
        "nutrition": {
            "calories": 50,
            "protein": 3,
            "fat": 1,
            "carbs": 5
        }
      },
      {
        "type": "汁物",
        "name": "豆腐と味噌汁",
        "cookingTime": 5,
        "difficulty": 1,
        "ingredients": [
          {"name": "豆腐", "amount": 100, "unit": "g"},
          {"name": "味噌", "amount": 1, "unit": "大さじ"}
        ],
        "steps": [
          "だしを沸かす",
          "豆腐を入れて味噌を溶く"
        ],
        "tips": "味噌は最後に溶く",
        "nutrition": {
            "calories": 80,
            "protein": 7,
            "fat": 3,
            "carbs": 6
        }
      }
    ]
  },
  "alternativeA": {
    "title": "洋風プレート",
    "reason": "和食が苦手な場合の代替案。同じ食材で洋風に。",
    "tags": ["洋食", "ヘルシー"],
    "dishes": [...]
  },
  "alternativeB": {
    "title": "時短！親子丼",
    "reason": "忙しい日向け。15分で完成。",
    "tags": ["時短", "簡単", "丼もの"],
    "dishes": [...]
  }
}

**重要**: 必ずJSON形式で出力してください。余計な説明文は不要です。`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: "上記の食材で献立を3パターン提案してください。",
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4000, // 3パターン分の長さを確保
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content generated");

    const result = JSON.parse(content) as MenuGenerationResult;

    // Validation: Ensure all required fields exist
    if (!result.main || !result.alternativeA || !result.alternativeB) {
      throw new Error("AI did not return all 3 menu patterns");
    }

    return result;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("献立の生成に失敗しました。もう一度お試しください。");
  }
}
