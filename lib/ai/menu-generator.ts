//lib/ai/menu-generator.ts
import OpenAI from "openai";
import { Ingredient, UserPreferences } from "@prisma/client";
import { differenceInDays } from "date-fns";
import { checkAllergens } from "./allergen-checker";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// JSON修復関数
function attemptJSONRepair(content: string): string {
  let repaired = content.trim();

  // 1. 最後の}が欠けている場合の修復
  const openBraces = (repaired.match(/\{/g) || []).length;
  const closeBraces = (repaired.match(/\}/g) || []).length;
  const missingBraces = openBraces - closeBraces;

  if (missingBraces > 0) {
    repaired += "}".repeat(missingBraces);
  }

  // 2. 最後の"]"が欠けている場合の修復
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/\]/g) || []).length;
  const missingBrackets = openBrackets - closeBrackets;

  if (missingBrackets > 0) {
    repaired += "]".repeat(missingBrackets);
  }

  // 3. 文字列の終わりが切れている場合の修復
  const lines = repaired.split("\n");
  const lastLine = lines[lines.length - 1];

  // 最後の行が不完全な場合
  if (
    lastLine &&
    !lastLine.trim().endsWith("}") &&
    !lastLine.trim().endsWith("]")
  ) {
    // 最後の " が欠けている場合
    const quotes = (lastLine.match(/"/g) || []).length;
    if (quotes % 2 === 1) {
      repaired += '"';
    }

    // 値が途中で切れている場合
    if (lastLine.includes('"name":') && !lastLine.includes(",")) {
      repaired += '",';
    }
  }

  return repaired;
}

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
    nutrition?: {
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
    };
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
  userId: string,
  options?: { servings?: number; budget?: number | null },
): Promise<MenuGenerationResult> {
  // Fetch detailed preferences and safety info
  const [preferences, allergies, restrictions] = await Promise.all([
    prisma.userPreferences.findUnique({ where: { userId } }),
    prisma.userAllergy.findMany({ where: { userId } }),
    prisma.userRestriction.findMany({ where: { userId } }),
  ]);

  const taste = (preferences?.tasteJson as any) || {};
  const lifestyle = taste.lifestyle?.defaultMode || {};
  const servings = options?.servings || 1;
  const budget = options?.budget;

  // 1. Safety Layer (System Message - Immutable)
  const allergenList = allergies.map((a) => a.label || a.allergen).join(", ");
  const restrictionNote = restrictions
    .map((r) => `${r.type}${r.note ? `: ${r.note}` : ""}`)
    .join("; ");

  let safetyInstructions = `You are a professional cooking assistant.
# CRITICAL SAFETY RULES
1. NEVER suggest recipes containing these allergens: ${allergenList || "None"}.
2. Adhere to these dietary restrictions: ${restrictionNote || "None"}.
3. If ANY suggested recipe contains an allergen, response MUST include "error": "ALLERGEN_DETECTED".
4. EXTERNAL FOOD EXCLUSION: Do not suggest takeout, delivery, or prepared store-bought meals. Only suggest home-cooked recipes.`;

  // 2. Pro Feature Layer (System Message - High Priority)
  if (preferences?.aiMessageEnabled && taste.freeText) {
    safetyInstructions += `\n\n# USER SPECIAL INSTRUCTIONS (PRO)
These instructions have high priority:
${taste.freeText}`;
  }

  // Add Settings to System Prompt
  const budgetPrompt = budget
    ? `budget: approx ${budget} yen per serving (strict limit)`
    : "budget: ignore cost";

  safetyInstructions += `\n\n# GENERATION SETTINGS
- Servings: ${servings} person(s)
- Budget Goal: ${budgetPrompt}
- **Strictly scale all ingredient amounts for ${servings} servings.**`;

  // 3. Preferences Layer (User Message - Preferred tendencies)
  const tastePrefsEntries = taste.tasteScores
    ? Object.entries(taste.tasteScores)
    : [];
  const tastePrefs =
    tastePrefsEntries.length > 0
      ? tastePrefsEntries
          .map(([k, v]) => `${k}: ${(v as number) > 0 ? "+" + v : v}`)
          .join(", ")
      : "None";

  const equipment = (
    taste.equipment ||
    preferences?.kitchenEquipment ||
    []
  ).join(", ");
  const methods = (
    taste.preferredMethods ||
    preferences?.comfortableMethods ||
    []
  ).join(", ");
  const genrePrefsEntries = taste.recentGenrePenalty
    ? Object.entries(taste.recentGenrePenalty)
    : [];
  const genrePrefs =
    genrePrefsEntries.length > 0
      ? genrePrefsEntries.map(([k, v]) => `${k}: ${v}`).join(", ")
      : "None";

  const userContext = `User Profile:
- Favorite/Avoid Tastes: ${tastePrefs}
- Equipment: ${equipment}
- Preferred Methods: ${methods}
- Lifestyle Priority: ${lifestyle.timePriority || "normal"}
- Genre Preferences: ${genrePrefs}
- Target Servings: ${servings}`;

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
  const equipmentOld = Array.isArray(preferences?.kitchenEquipment)
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
- 利用可能な設備: ${equipmentOld}

# 重要な制約
1. **手持ちの食材を最大限活用すること**
   - できるだけ上記の食材を使う
   - 足りない調味料は基本調味料（醤油、塩、砂糖、酢、油など）のみ許可
   - 特殊な食材を追加で買わせない

2. **賞味期限の近い食材を優先的に使うこと**
   - 「優先的に使うべき食材」リストの食材を積極的に使う

3. **避けたい調理法は絶対に使わないこと**

# 提案する献立パターン（必ず3パターン、各3品構成）

**1. メイン提案**
- 最も栄養バランスが良く、賞味期限の近い食材を優先。
- 定食スタイル（主菜・副菜・汁物）。
- 全料理に nutrition 要。

**2. 代替案A**
- 別ジャンル。3品構成。
- 全料理に nutrition 要。

**3. 代替案B**
- 15分以内の時短献立。
- 全料理に nutrition 要。

# 出力形式（必ずこのJSON形式で。各 dishes に nutrition を含めること）

{
  "main": {
    "title": "今日のおすすめ定食",
    "reason": "説明",
    "tags": ["和食"],
    "dishes": [
      {
        "type": "主菜",
        "name": "料理名",
        "cookingTime": 20,
        "difficulty": 2,
        "ingredients": [{"name": "食材", "amount": 100, "unit": "g"}],
        "steps": ["手順1", "手順2"],
        "tips": "コツ",
        "nutrition": {"calories": 300, "protein": 20, "fat": 15, "carbs": 25}
      }
    ]
  },
  "alternativeA": {
    "title": "メニューA",
    "reason": "理由",
    "tags": ["洋食"],
    "dishes": [
      {
        "type": "主菜",
        "name": "料理名",
        "cookingTime": 15,
        "difficulty": 2,
        "ingredients": [{"name": "食材", "amount": 100, "unit": "g"}],
        "steps": ["手順1"],
        "tips": "コツ",
        "nutrition": {"calories": 250, "protein": 15, "fat": 10, "carbs": 30}
      }
    ]
  },
  "alternativeB": {
    "title": "スピードメニュー",
    "reason": "理由",
    "tags": ["時短"],
    "dishes": [
      {
        "type": "主菜",
        "name": "料理名",
        "cookingTime": 10,
        "difficulty": 1,
        "ingredients": [{"name": "食材", "amount": 100, "unit": "g"}],
        "steps": ["手順1"],
        "tips": "コツ",
        "nutrition": {"calories": 200, "protein": 12, "fat": 8, "carbs": 40}
      }
    ]
  }
}

**重要**:
- 必ず有効なJSONのみを出力してください。
- 全ての dishes 項目に nutrition（calories, protein, fat, carbs）の数値を必ず含めてください。
- 必ず "main", "alternativeA", "alternativeB" の3つのキーを持つオブジェクトを返してください。`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: safetyInstructions + "\n\n" + systemPrompt },
        {
          role: "user",
          content: `${userContext}\n\n在庫食材: ${ingredients.map((i) => i.name).join(", ")}\n\n上記のシステムプロンプトで指定されたJSON形式で、必ず "main", "alternativeA", "alternativeB" の3つの献立パターンを生成してください。各献立は3品構成（主菜・副菜・汁物）で、全ての料理に栄養情報を含めてください。`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      console.error("[AI] No content returned from OpenAI");
      throw new Error("AIからの応答が空でした");
    }

    let result: MenuGenerationResult;
    try {
      // まず通常のパースを試行
      result = JSON.parse(content) as MenuGenerationResult;
      if ((result as any).error === "ALLERGEN_DETECTED") {
        throw new Error(
          "アレルギー物質が含まれる可能性があるため、生成を中断しました。設定を確認してください。",
        );
      }
    } catch (parseError) {
      console.error("[AI] JSON Parse Error. Content:", content);
      console.error("[AI] Content length:", content.length);
      console.error("[AI] Last 200 chars:", content.slice(-200));
      console.error("[AI] Parse error:", parseError);

      // JSON修復を試行
      try {
        const repairedContent = attemptJSONRepair(content);
        console.log("[AI] Attempting to repair JSON...");
        result = JSON.parse(repairedContent) as MenuGenerationResult;
        console.log("[AI] JSON repair successful");
      } catch (repairError) {
        console.error("[AI] JSON repair failed:", repairError);
        throw new Error("AIの応答を解析できませんでした");
      }
    }

    // --- SECONDARY SAFETY CHECK (Post-generation) ---
    const allIngredients: string[] = [];
    [result.main, result.alternativeA, result.alternativeB].forEach((m) => {
      m?.dishes?.forEach((d) => {
        d.ingredients?.forEach((i) => allIngredients.push(i.name));
      });
    });

    const allergenCheck = checkAllergens(
      allIngredients,
      allergies.map((a) => a.allergen),
    );
    if (allergenCheck) {
      console.error("[SAFETY] Allergen detected in post-check:", allergenCheck);
      throw new Error(
        `提案にアレルギー物質（${allergenCheck.allergen}）が含まれています。より安全な条件で再生成してください。`,
      );
    }

    // Convert legacy format to new structure if needed
    const convertLegacyFormat = (legacy: any): GeneratedMenu => {
      // If already in correct format, return as-is
      if (legacy.title && Array.isArray(legacy.dishes)) {
        return legacy as GeneratedMenu;
      }

      // Convert from {主菜: {...}, 副菜: {...}, 汁物: {...}} format
      const dishes: any[] = [];
      const types = ["主菜", "副菜", "汁物"];

      types.forEach((type) => {
        if (legacy[type]) {
          const dish = legacy[type];
          dishes.push({
            type,
            name: dish.name || "",
            cookingTime: dish.cookingTime || 20,
            difficulty: dish.difficulty || 2,
            ingredients: dish.ingredients || [],
            steps: dish.method ? [dish.method] : dish.steps || [],
            tips: dish.tips || "",
            nutrition: dish.nutrition || {
              calories: 0,
              protein: 0,
              fat: 0,
              carbs: 0,
            },
          });
        }
      });

      return {
        title: legacy.title || "献立提案",
        reason: legacy.reason || "手持ち食材を使った献立です",
        tags: legacy.tags || ["和食"],
        dishes,
      };
    };

    // Convert all menus to proper format
    result.main = convertLegacyFormat(result.main);
    result.alternativeA = convertLegacyFormat(result.alternativeA);
    result.alternativeB = convertLegacyFormat(result.alternativeB);

    // Validation
    const isValid = (menu: any) =>
      menu &&
      typeof menu === "object" &&
      menu.title &&
      Array.isArray(menu.dishes) &&
      menu.dishes.length > 0;

    if (!isValid(result.main)) {
      console.error("[AI] Invalid main menu:", result.main);
      throw new Error("AIが有効なメイン献立を生成できませんでした");
    }

    // Fallback for alternatives if missing
    if (!isValid(result.alternativeA)) {
      console.warn("[AI] Alternative A invalid, using main as fallback");
      result.alternativeA = JSON.parse(JSON.stringify(result.main));
    }
    if (!isValid(result.alternativeB)) {
      console.warn("[AI] Alternative B invalid, using main as fallback");
      result.alternativeB = JSON.parse(JSON.stringify(result.main));
    }

    // Normalize
    const normalize = (menu: GeneratedMenu) => {
      if (!menu.dishes) menu.dishes = [];
      menu.dishes.forEach((dish) => {
        if (!dish.nutrition) {
          dish.nutrition = { calories: 0, protein: 0, fat: 0, carbs: 0 };
        }
        // Ensure numbers
        if (typeof dish.cookingTime === "string")
          dish.cookingTime = parseInt(dish.cookingTime) || 20;
        if (typeof dish.difficulty === "string")
          dish.difficulty = parseInt(dish.difficulty) || 3;
      });
    };
    normalize(result.main);
    normalize(result.alternativeA);
    normalize(result.alternativeB);

    return result;
  } catch (error: any) {
    console.error("AI Generation Process Error:", error);
    throw new Error(error.message || "献立の生成中にエラーが発生しました。");
  }
}

/**
 * Generate a 7-day weekly meal plan in a SINGLE AI call
 */
export async function generateWeeklyPlanAI(
  ingredients: Ingredient[],
  preferences: UserPreferences | null,
  expiringSoon: Ingredient[],
): Promise<any[]> {
  // Returning an array of "Main" menus for 7 days

  // Extract preferences
  const criticalThreshold = (preferences as any)?.expirationCriticalDays ?? 2;
  const warningThreshold = (preferences as any)?.expirationWarningDays ?? 5;
  const priorityWeight = (preferences as any)?.expirationPriorityWeight ?? 0.7;

  // Build Ingredient Lists (Same logic as above, reused)
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

  const systemPrompt = `あなたはプロの献立プランナーです。
冷蔵庫の食材を効率よく使い切るための「1週間分の夕食献立」を提案してください。

# 手持ち食材
${ingredientList}

# ユーザー情報
- 料理スキル: ${preferences?.cookingSkill || "intermediate"}
- 期限切れ間近の食材優先度: ${Math.round(priorityWeight * 100)}%

# 目標
1. 7日分の献立（主菜・副菜・汁物）を一括で作成する。
2. 賞味期限の近い食材から順に使う計画を立てる。
3. 同じ食材を使い回して、無駄が出ないようにする。
4. 足りない食材は「買い足し」として認識するが、なるべく今あるものを使う。

# 出力形式 (JSON Array of 7 days)
[
  {
    "title": "1日目: 鶏肉の使い切り定食",
    "reason": "期限が近い鶏肉をメインに使用。",
    "tags": ["鶏肉", "和食"],
    "dishes": [
      { "type": "主菜", "name": "...", "ingredients": [{"name":"...", "amount":...}], "steps": ["..."], "tips": "..." },
      { "type": "副菜", "name": "...", ... },
      { "type": "汁物", "name": "...", ... }
    ]
  },
  ... (7日分)
]

**重要**: 必ず7日分の配列を含むJSONのみを出力してください。`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use mini for speed/cost, context window handles 7 days
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: "在庫を考慮した最適なおまかせ1週間献立を作ってください。",
        },
      ],
      response_format: { type: "json_object" }, // We need to wrap array in object? Or generic json.
      // gpt-4o-mini json_object mode requires "JSON" in prompt.
      // And usually enforces object root. Let's ask for object with "days" key.
      // Update prompt below slightly.
    });

    // Actually let's adjust prompt to return object { "week": [...] } to be safe with strict JSON mode
    // But let's try direct map first or handle parsing.

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content generated");

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // retry logic or fallback
      throw new Error("Failed to parse AI response");
    }

    // Handle if root is object or array
    if (Array.isArray(parsed)) return parsed;
    if (parsed.days && Array.isArray(parsed.days)) return parsed.days;
    if (parsed.week && Array.isArray(parsed.week)) return parsed.week;

    // Fallback check: maybe it put it in "menus"
    const values = Object.values(parsed);
    const arrayVal = values.find((v) => Array.isArray(v) && v.length >= 7);
    if (arrayVal) return arrayVal as any[];

    throw new Error("AI response format invalid (not 7 days)");
  } catch (e) {
    console.error("Weekly AI Error", e);
    throw new Error("週間献立の生成に失敗しました");
  }
}
