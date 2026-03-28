// GENERATED_BY_AI: 2026-03-18 antigravity
//lib/ai/menu-generator.ts
import OpenAI from "openai";
import { Ingredient, UserPreferences } from "@prisma/client";
import { differenceInDays } from "date-fns";
import { checkAllergens } from "./allergen-checker";
import { prisma } from "@/lib/prisma";
import { NutritionCalculator } from "../nutrition/calculator";
import { IngredientWithAmount } from "../nutrition/index";
import { IMPLICIT_INGREDIENTS_FOR_PROMPT } from "@/lib/constants/implicit-ingredients";
import type { ConstraintMode } from "@/types";

type IngredientWithProduct = Ingredient & {
  product?: {
    id: string;
    name: string;
    brandName: string | null;
    ingredientType: string;
    requiresAdditionalIngredients: unknown;
    instructionTemplate: string | null;
    nutritionEstimate: unknown;
  } | null;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// JSON修復関数
function attemptJSONRepair(content: string): string {
  let repaired = content.trim();

  // 1. 最後の}が欠けている場合の修復
  const openBraces = (repaired.match(/\{/g) ?? []).length;
  const closeBraces = (repaired.match(/\}/g) ?? []).length;
  const missingBraces = openBraces - closeBraces;

  if (missingBraces > 0) {
    repaired += "}".repeat(missingBraces);
  }

  // 2. 最後の"]"が欠けている場合の修復
  const openBrackets = (repaired.match(/\[/g) ?? []).length;
  const closeBrackets = (repaired.match(/\]/g) ?? []).length;
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
    const quotes = (lastLine.match(/"/g) ?? []).length;
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
      salt?: number;
    };
  }[];
}

export interface MenuGenerationResult {
  main: GeneratedMenu;
  alternativeA: GeneratedMenu;
  alternativeB: GeneratedMenu;
}

type TasteLifestyleMode = {
  timePriority?: string;
  dishwashingAvoid?: boolean;
  singlePan?: boolean;
};

type TasteJson = {
  tasteScores?: Record<string, number>;
  lifestyle?: {
    weekdayMode?: TasteLifestyleMode;
    weekendMode?: TasteLifestyleMode;
    defaultMode?: TasteLifestyleMode;
  };
  freeText?: string;
  equipment?: string[];
  preferredMethods?: string[];
  recentGenrePenalty?: Record<string, number>;
};

/**
 * Generate 3 menu patterns using OpenAI
 */
export async function generateMenus(
  ingredients: IngredientWithProduct[],
  userId: string,
  options?: { servings?: number; budget?: number | null; mode?: ConstraintMode },
): Promise<MenuGenerationResult> {
  // Fetch detailed preferences and safety info
  const [preferences, allergies, restrictions] = await Promise.all([
    // Workaround for Prisma bug with String[] fields: Use $queryRaw for UserPreferences
    prisma
      .$queryRaw<UserPreferences[]>`SELECT * FROM "UserPreferences" WHERE "userId" = ${userId} LIMIT 1`
      .then((rows) => (rows.length > 0 ? rows[0] : null)),
    prisma.userAllergy.findMany({ where: { userId } }),
    prisma.userRestriction.findMany({ where: { userId } }),
  ]);

  const taste = (preferences?.tasteJson as TasteJson | null | undefined) ?? {};
  const dayOfWeek = new Date().getDay(); // 0=Sunday, 6=Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const lifestyle = isWeekend
    ? (taste.lifestyle?.weekendMode ?? taste.lifestyle?.defaultMode ?? {})
    : (taste.lifestyle?.weekdayMode ?? taste.lifestyle?.defaultMode ?? {});
  const servings = options?.servings ?? 1;
  const budget = options?.budget;
  const constraintMode: ConstraintMode = options?.mode ?? "flexible";

  // 1. Safety Layer (System Message - Immutable)
  const allergenList = allergies
    .map((a) => a.label ?? a.allergen)
    .filter((s): s is string => typeof s === "string")
    .join(", ");
  const restrictionNote = restrictions
    .map((r) => `${r.type}${r.note ? `: ${r.note}` : ""}`)
    .join("; ");

  let safetyInstructions = `You are a professional cooking assistant.
# CRITICAL SAFETY RULES
1. NEVER suggest recipes containing these allergens: ${allergenList.length > 0 ? allergenList : "None"}.
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
    taste.equipment ?? preferences?.kitchenEquipment ?? []
  ).join(", ");
  const methods = (
    taste.preferredMethods ?? preferences?.comfortableMethods ?? []
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
- Lifestyle Priority: ${lifestyle.timePriority ?? "normal"}
- Genre Preferences: ${genrePrefs}
- Target Servings: ${servings}`;

  // Extract preferences with proper type handling
  // Note: key casting to any to bypass stale Prisma types in editor
  const prefsWithExpiry = preferences as
    | (UserPreferences & {
      expirationCriticalDays?: number;
      expirationWarningDays?: number;
      expirationPriorityWeight?: number;
    })
    | null;
  const _criticalThreshold = prefsWithExpiry?.expirationCriticalDays ?? 2;
  const _warningThreshold = prefsWithExpiry?.expirationWarningDays ?? 5;
  const priorityWeight = prefsWithExpiry?.expirationPriorityWeight ?? 0.7;

  // Filter ingredients by custom thresholds
  const critical = ingredients.filter((i) => {
    if (!i.expirationDate) return false;
    const days = differenceInDays(i.expirationDate, new Date());
    return days >= -2 && days <= _criticalThreshold; // -2 to include slightly expired
  });

  const warning = ingredients.filter((i) => {
    if (!i.expirationDate) return false;
    const days = differenceInDays(i.expirationDate, new Date());
    return days > _criticalThreshold && days <= _warningThreshold;
  });

  // Format ingredients (general list) - 加工食品対応
  const ingredientList = ingredients
    .map((i) => {
      let quantity = "";
      if (i.amount) quantity = ` (${i.amount}${i.unit ?? ""})`;
      else if (i.amountLevel) quantity = ` (${i.amountLevel})`;

      // Expiration
      let expiry = "";
      if (i.expirationDate) {
        const days = differenceInDays(i.expirationDate, new Date());
        expiry = ` [期限まで${days}日]`;
      }

      // 加工食品タイプ表示 (自動推論されたもの)
      const ingType = (i as { ingredientType?: string }).ingredientType ?? "raw";
      let typeLabel = "";
      if (ingType === "processed_base") {
        typeLabel = " 【加工:調理ベース】";
      } else if (ingType === "instant_complete") {
        typeLabel = " 【加工:そのまま完成】";
      }

      return `- ${i.name}${quantity}${expiry}${typeLabel}`;
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
  const cookingSkill = preferences?.cookingSkill ?? "intermediate";
  const comfortableMethods = Array.isArray(preferences?.comfortableMethods)
    ? (preferences.comfortableMethods as string[]).join(", ")
    : "なし";
  const avoidMethods = Array.isArray(preferences?.avoidMethods)
    ? (preferences.avoidMethods as string[]).join(", ")
    : "なし";
  const equipmentOld = Array.isArray(preferences?.kitchenEquipment)
    ? (preferences.kitchenEquipment as string[]).join(", ")
    : "標準的なキッチン（ガスコンロ、IH、電子レンジ、フライパン、鍋）";

  // ── Constraint Mode によるプロンプト分岐 ──
  const implicitList = IMPLICIT_INGREDIENTS_FOR_PROMPT.join("、");

  const constraintRules = constraintMode === "strict"
    ? `# 🔒 制約モード: STRICT（完全一致）
## 絶対遵守ルール
1. 以下の2種類の食材 **のみ** 使用可能です。それ以外は一切使用禁止です。
   - **手持ち食材リスト** に記載された食材
   - **暗黙食材（基本調味料）**: ${implicitList}
2. 上記以外の食材を1つでも使用したレシピは無効です。
3. もし上記の食材だけでは有効なレシピが作れない場合、以下のJSONを返してください:
   {"error": "INSUFFICIENT_INVENTORY"}
4. 加工食品（カレールーなど）は単体でも調理成立として扱えます。
5. 各レシピは現実的に調理可能でなければなりません。`
    : `# 🔓 制約モード: FLEXIBLE（一部許可）
## ルール
1. 手持ち食材を最優先で使用してください。
2. 不足食材は最大2品まで追加を許可します。
3. 在庫外の食材は明確に区別してください。
4. 可能な限り代替食材を提案してください。
5. 基本的な調味料（${implicitList}）は自由に使用可能です。`;

  const systemPrompt = `あなたはプロの献立プランナーです。
冷蔵庫にある食材を最大限に活用し、実用的で美味しい、質の高い家庭料理の献立を提案してください。

${constraintRules}

# 手持ち食材 (厳格な在庫リスト)
${ingredientList}

# 加工食品の取り扱いルール（重要）
1. **通常食材（raw）**: 通常通り工程を記述（例：キャベツを洗う→切る→炒める）
2. **調理ベース（processed_base）**: カレールーや鍋の素など。パッケージの一般的な調理手順に従い、「商品操作手順に従い、○○を仕上げる」という内容を必ず工程に含めること。
3. **そのまま完成（instant_complete）**: レトルトカレーや即席スープなど。工程は原則1つ「商品操作手順に従い準備する」とする。

# ⚠️ 最優先で使うべき食材（${_criticalThreshold}日以内）
${criticalList}

# 優先的に使うべき食材（${_warningThreshold}日以内）
${warningList}

優先度: ${Math.round(priorityWeight * 100)}% の確率でこれらの期限間近の食材を使用してください。

# ユーザー情報
- 料理スキル: ${cookingSkill}
- 得意な調理法: ${comfortableMethods}
- 避けたい調理法: ${avoidMethods}
- 利用可能な設備: ${equipmentOld}
- 味の好み: ${tastePrefs}
- ジャンルの好み: ${genrePrefs}
- ライフスタイル優先度: ${lifestyle.timePriority ?? "normal"}
- 時短優先: ${lifestyle.timePriority === "fast" ? "はい" : "いいえ"}
- 洗い物回避: ${lifestyle.dishwashingAvoid ? "はい" : "いいえ"}
- 一つの鍋で調理: ${lifestyle.singlePan ? "はい" : "いいえ"}

# 🚨 最重要ルール (CRITICAL RULES) - 違反厳禁 🚨
1. **食材の捏造（ハルシネーション）禁止**
   - 上記の「手持ち食材」リストに存在しない食材や調味料を絶対に使用しないでください。
   - 唯一の例外として、暗黙食材（${implicitList}）のみ追加使用を許可します。
   - レシピの \`ingredients\` 配列に含める食材名は、手持ち食材のリストと完全に一致させてください。
2. **分量の厳守**
   - 料理に使う分量は、リストに示された「在庫の量 (amount)」を絶対に超えないでください。
3. **手順の質**
   - \`steps\` (調理手順) は「材料を揃える」「炒める」のような短すぎる雑な説明は禁止します。
   - 各ステップは何をどうするか（例：「玉ねぎは薄切りにし、鶏肉は一口大に切る」「フライパンに油を熱し、鶏肉を中火で色が変わるまで炒める」）具体的に記述してください。
4. **好みの分散と飽き防止**
   - ユーザーの「味の好み」や「ジャンルの好み」は尊重しますが、毎日同じもの（例：毎日カレー）を提案しないでください。
   - 必ず、3つの献立パターンの間でジャンルや味付け（和食・洋食・中華など）を散らしてください。
5. **指定人数の適用**
   - 各レシピの分量は、必ず ${servings} 人前 になるように計算してください。

# 提案する献立パターン（必ず3パターン）
**1. main (メイン提案)**
   - 最も栄養バランスが良く、期限間近の食材を最優先で消化する献立。
**2. alternativeA (代替案A)**
   - mainとは全く異なるジャンル・味付けの献立。
**3. alternativeB (スピードメニュー)**
   - 調理時間15分以内の時短献立。

**重要**: 各献立は必ず「主菜・副菜・汁物」の3品構成で作成してください。

# 出力形式 (厳格なJSON)
{
  "main": {
    "title": "今日のおすすめ定食",
    "reason": "期限が近い食材を使い切れる、栄養満点の和食です。",
    "tags": ["和食", "使い切り"],
    "dishes": [
      {
        "type": "主菜",
        "name": "鶏肉と玉ねぎの甘辛炒め",
        "cookingTime": 20,
        "difficulty": 2,
        "ingredients": [
          {"name": "鶏むね肉", "amount": 200, "unit": "g"},
          {"name": "玉ねぎ", "amount": 1, "unit": "個"}
        ],
        "steps": [
          "玉ねぎはくし形に切り、鶏むね肉は一口大のそぎ切りにする。",
          "フライパンに油を熱し、鶏肉を中火で両面に焼き色がつくまで焼く。",
          "玉ねぎを加えて軽く炒め合わせたら、醤油大さじ1、みりん大さじ1を加えて全体に絡め、照りが出たら完成。"
        ],
        "tips": "鶏肉はそぎ切りにすることで火の通りが早くなります。"
      },
      {
        "type": "副菜",
        "name": "ほうれん草のおひたし",
        "cookingTime": 10,
        "difficulty": 1,
        "ingredients": [
          {"name": "ほうれん草", "amount": 100, "unit": "g"}
        ],
        "steps": [
          "ほうれん草は茹でて水気を切り、3cm長さに切る。",
          "醤油とみりんをかけて和える。"
        ],
        "tips": "茹ですぎに注意してください。"
      },
      {
        "type": "汁物",
        "name": "わかめと豆腐の味噌汁",
        "cookingTime": 10,
        "difficulty": 1,
        "ingredients": [
          {"name": "豆腐", "amount": 100, "unit": "g"},
          {"name": "わかめ", "amount": 5, "unit": "g"}
        ],
        "steps": [
          "鍋にだし汁を沸かし、豆腐とわかめを入れる。",
          "味噌を溶き入れ、沸騰直前で火を止める。"
        ],
        "tips": "味噌は最後に入れ、沸騰させないと風味が失われます。"
      }
    ]
  },
  "alternativeA": { ... },
  "alternativeB": { ... }
}

**重要**: 栄養情報はシステム側で計算するため、料理情報のみ生成してください。有効なJSONのみ出力してください。`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: safetyInstructions + "\n\n" + systemPrompt },
        {
          role: "user",
          content: `${userContext}\n\n在庫食材: ${ingredients.map((i) => i.name).join(", ")}\n\n上記のシステムプロンプトで指定されたJSON形式で、必ず "main", "alternativeA", "alternativeB" の3つの献立パターンを生成してください。各献立は3品構成（主菜・副菜・汁物）で、栄養情報はシステム側で計算するため料理情報のみ生成してください。`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message.content;
    if (!content) {
      console.error("[AI] No content returned from OpenAI");
      throw new Error("AIからの応答が空でした");
    }

    let result: MenuGenerationResult;
    try {
      // まず通常のパースを試行
      result = JSON.parse(content) as MenuGenerationResult;

      // Strict モードで INSUFFICIENT_INVENTORY エラーが返された場合
      if ((result as { error?: string }).error === "INSUFFICIENT_INVENTORY") {
        const err = new Error(
          "現在の在庫では条件を満たす献立を生成できません",
        );
        (err as any).code = "INSUFFICIENT_INVENTORY";
        throw err;
      }

      if ((result as { error?: string }).error === "ALLERGEN_DETECTED") {
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
        result = JSON.parse(repairedContent) as MenuGenerationResult;
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
    const convertLegacyFormat = (legacy: unknown): GeneratedMenu => {
      // If already in correct format, return as-is
      if (
        legacy &&
        typeof legacy === "object" &&
        "title" in legacy &&
        "dishes" in legacy &&
        typeof (legacy as { title?: unknown }).title === "string" &&
        Array.isArray((legacy as { dishes?: unknown }).dishes)
      ) {
        return legacy as GeneratedMenu;
      }

      // Convert from {主菜: {...}, 副菜: {...}, 汁物: {...}} format
      const dishes: GeneratedMenu["dishes"] = [];
      const types = ["主菜", "副菜", "汁物"];

      const legacyObj = legacy as Record<string, unknown> | null;

      types.forEach((type) => {
        if (legacyObj && typeof legacyObj === "object" && legacyObj[type]) {
          const dish = legacyObj[type] as Record<string, unknown>;
          dishes.push({
            type,
            name: typeof dish.name === "string" ? dish.name : "",
            cookingTime:
              typeof dish.cookingTime === "number" ? dish.cookingTime : 20,
            difficulty:
              typeof dish.difficulty === "number" ? dish.difficulty : 2,
            ingredients: Array.isArray(dish.ingredients)
              ? (dish.ingredients as GeneratedMenu["dishes"][number]["ingredients"])
              : [],
            steps:
              typeof dish.method === "string"
                ? [dish.method]
                : Array.isArray(dish.steps)
                  ? (dish.steps as string[])
                  : [],
            tips: typeof dish.tips === "string" ? dish.tips : "",
            nutrition:
              dish.nutrition && typeof dish.nutrition === "object"
                ? (dish.nutrition as GeneratedMenu["dishes"][number]["nutrition"])
                : {
                  calories: 0,
                  protein: 0,
                  fat: 0,
                  carbs: 0,
                },
          });
        }
      });

      return {
        title:
          legacyObj && typeof legacyObj.title === "string"
            ? legacyObj.title
            : "献立提案",
        reason:
          legacyObj && typeof legacyObj.reason === "string"
            ? legacyObj.reason
            : "手持ち食材を使った献立です",
        tags:
          legacyObj && Array.isArray(legacyObj.tags)
            ? (legacyObj.tags as string[])
            : ["和食"],
        dishes,
      };
    };

    // Convert all menus to proper format
    result.main = convertLegacyFormat(result.main);
    result.alternativeA = convertLegacyFormat(result.alternativeA);
    result.alternativeB = convertLegacyFormat(result.alternativeB);

    // Validation
    const isValid = (menu: unknown): menu is GeneratedMenu => {
      if (!menu || typeof menu !== "object") return false;
      const m = menu as { title?: unknown; dishes?: unknown };
      return (
        typeof m.title === "string" &&
        Array.isArray(m.dishes) &&
        m.dishes.length > 0
      );
    };

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

    // Normalize and calculate nutrition locally
    const nutritionCalculator = new NutritionCalculator();
    
    const normalize = async (menu: GeneratedMenu) => {
      if (!menu.dishes) menu.dishes = [];
      
      for (const dish of menu.dishes) {
        // AIから提供された栄養情報を一旦クリア
        dish.nutrition = undefined;
        
        // 食材からローカルで栄養計算
        if (dish.ingredients && dish.ingredients.length > 0) {
          const ingredientAmounts: IngredientWithAmount[] = dish.ingredients.map(ing => ({
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit
          }));
          
          try {
            dish.nutrition = await nutritionCalculator.calculateFromIngredients(ingredientAmounts);
          } catch (error) {
            console.warn('[Nutrition] 計算エラー、フォールバック値を使用:', error);
            dish.nutrition = { calories: 0, protein: 0, fat: 0, carbs: 0, salt: 0 };
          }
        } else {
          dish.nutrition = { calories: 0, protein: 0, fat: 0, carbs: 0, salt: 0 };
        }
        
        // Ensure numbers
        if (typeof dish.cookingTime === "string")
          dish.cookingTime = parseInt(dish.cookingTime) ?? 20;
        if (typeof dish.difficulty === "string")
          dish.difficulty = parseInt(dish.difficulty) ?? 3;
      }
    };
    
    await Promise.all([
      normalize(result.main),
      normalize(result.alternativeA),
      normalize(result.alternativeB)
    ]);

    return result;
  } catch (error: unknown) {
    console.error("AI Generation Process Error:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "献立の生成中にエラーが発生しました。",
    );
  }
}

/**
 * Generate a 7-day weekly meal plan in a SINGLE AI call
 */
export async function generateWeeklyPlanAI(
  ingredients: Ingredient[],
  preferences: UserPreferences | null,
  _expiringSoon: Ingredient[],
): Promise<unknown[]> {
  // Returning an array of "Main" menus for 7 days

  // Extract preferences
  const prefsWithExpiry = preferences as
    | (UserPreferences & {
      expirationCriticalDays?: number;
      expirationWarningDays?: number;
      expirationPriorityWeight?: number;
    })
    | null;
  const priorityWeight = prefsWithExpiry?.expirationPriorityWeight ?? 0.7;

  // Build Ingredient Lists (Same logic as above, reused)
  const ingredientList = ingredients
    .map((i) => {
      let quantity = "";
      if (i.amount) quantity = ` (${i.amount}${i.unit ?? ""})`;
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
- 料理スキル: ${preferences?.cookingSkill ?? "intermediate"}
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

    const content = completion.choices[0]?.message.content;
    if (!content) throw new Error("No content generated");

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
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
    if (arrayVal) return arrayVal as unknown[];

    throw new Error("AI response format invalid (not 7 days)");
  } catch (e: unknown) {
    console.error("Weekly AI Error", e);
    throw new Error("週間献立の生成に失敗しました");
  }
}

/**
 * Generate a single menu (for parallel execution)
 */
async function generateSingleMenuInternal(
  menuType: "main" | "alternativeA" | "alternativeB",
  ingredients: IngredientWithProduct[],
  userId: string,
  options?: { servings?: number; budget?: number | null; mode?: ConstraintMode },
): Promise<GeneratedMenu> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Fetch preferences and safety info (reusing logic from generateMenus)
  const [preferences, allergies, restrictions] = await Promise.all([
    prisma
      .$queryRaw<UserPreferences[]>`SELECT * FROM "UserPreferences" WHERE "userId" = ${userId} LIMIT 1`
      .then((rows) => (rows.length > 0 ? rows[0] : null)),
    prisma.userAllergy.findMany({ where: { userId } }),
    prisma.userRestriction.findMany({ where: { userId } }),
  ]);

  const taste = (preferences?.tasteJson as TasteJson | null | undefined) ?? {};
  const dayOfWeek = new Date().getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const lifestyle = isWeekend
    ? (taste.lifestyle?.weekendMode ?? taste.lifestyle?.defaultMode ?? {})
    : (taste.lifestyle?.weekdayMode ?? taste.lifestyle?.defaultMode ?? {});
  const servings = options?.servings ?? 1;
  const budget = options?.budget;
  const constraintMode: ConstraintMode = options?.mode ?? "flexible";

  // Build prompt for single menu
  const menuTypeInstructions = {
    main: "最も栄養バランスが良く、期限間近の食材を最優先で消化する献立。",
    alternativeA: "mainとは全く異なるジャンル・味付けの献立。",
    alternativeB: "調理時間15分以内の時短献立。",
  };

  // Build ingredient list
  const ingredientList = ingredients
    .map((i) => {
      let quantity = "";
      if (i.amount) quantity = ` (${i.amount}${i.unit ?? ""})`;
      else if (i.amountLevel) quantity = ` (${i.amountLevel})`;
      let expiry = "";
      if (i.expirationDate) {
        const days = differenceInDays(i.expirationDate, new Date());
        expiry = ` [期限まで${days}日]`;
      }
      return `- ${i.name}${quantity}${expiry}`;
    })
    .join("\n");

  const allergenList = allergies
    .map((a) => a.label ?? a.allergen)
    .filter((s): s is string => typeof s === "string")
    .join(", ");
  const restrictionNote = restrictions
    .map((r) => `${r.type}${r.note ? `: ${r.note}` : ""}`)
    .join("; ");

  const cookingSkill = preferences?.cookingSkill ?? "intermediate";
  const comfortableMethods = Array.isArray(preferences?.comfortableMethods)
    ? (preferences.comfortableMethods as string[]).join(", ")
    : "なし";
  const avoidMethods = Array.isArray(preferences?.avoidMethods)
    ? (preferences.avoidMethods as string[]).join(", ")
    : "なし";
  const equipment = (
    taste.equipment ?? preferences?.kitchenEquipment ?? []
  ).join(", ");
  const tastePrefsEntries = taste.tasteScores
    ? Object.entries(taste.tasteScores)
    : [];
  const tastePrefs =
    tastePrefsEntries.length > 0
      ? tastePrefsEntries
        .map(([k, v]) => `${k}: ${(v as number) > 0 ? "+" + v : v}`)
        .join(", ")
      : "None";

  const singleMenuPrompt = `あなたはプロの献立プランナーです。
冷蔵庫にある食材を最大限に活用し、実用的で美味しい家庭料理の献立を1つ提案してください。

# 献立タイプ
${menuType} (${menuTypeInstructions[menuType]})

# CRITICAL SAFETY RULES
1. NEVER suggest recipes containing these allergens: ${allergenList.length > 0 ? allergenList : "None"}.
2. Adhere to these dietary restrictions: ${restrictionNote || "None"}.
3. EXTERNAL FOOD EXCLUSION: Do not suggest takeout, delivery, or prepared store-bought meals.

# GENERATION SETTINGS
- Servings: ${servings} person(s)
- Budget Goal: ${budget ? `approx ${budget} yen per serving` : "ignore cost"}

# 手持ち食材 (厳格な在庫リスト)
${ingredientList}

# ユーザー情報
- 料理スキル: ${cookingSkill}
- 得意な調理法: ${comfortableMethods}
- 避けたい調理法: ${avoidMethods}
- 利用可能な設備: ${equipment}
- 味の好み: ${tastePrefs}
- ライフスタイル優先度: ${lifestyle.timePriority ?? "normal"}

# 最重要ルール
1. **食材の捏造禁止**: 手持ち食材リストに存在しない食材は絶対に使用しない。
2. **分量の厳守**: 料理に使う分量は在庫の量を超えない。
3. **手順の質**: 各ステップは具体的に記述（例：「玉ねぎは薄切りにし、中火で炒める」）

# 出力形式 (厳格なJSON)
{
  "title": "献立名",
  "reason": "選定理由",
  "tags": ["和食", "使い切り"],
  "dishes": [
    {
      "type": "主菜",
      "name": "料理名",
      "cookingTime": 20,
      "difficulty": 2,
      "ingredients": [{"name": "食材名", "amount": 200, "unit": "g"}],
      "steps": ["具体的な手順1", "手順2"],
      "tips": "コツ"
    }
  ]
}

**重要**: 栄養情報は不要。有効なJSONのみ出力。`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: singleMenuPrompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: menuType === "main" ? 2000 : 2000, // main: 2000, others: shared 2000
  });

  const content = completion.choices[0]?.message.content;
  if (!content) {
    throw new Error(`AIからの応答が空でした (${menuType})`);
  }

  let result: GeneratedMenu;
  try {
    result = JSON.parse(content) as GeneratedMenu;
  } catch (parseError) {
    // Try JSON repair
    const repaired = attemptJSONRepair(content);
    result = JSON.parse(repaired) as GeneratedMenu;
  }

  // Validate and normalize
  if (!result.dishes || result.dishes.length === 0) {
    throw new Error(`無効な献立形式が返されました (${menuType})`);
  }

  // Calculate nutrition locally
  const nutritionCalculator = new NutritionCalculator();
  for (const dish of result.dishes) {
    dish.nutrition = undefined;
    if (dish.ingredients && dish.ingredients.length > 0) {
      const ingredientAmounts: IngredientWithAmount[] = dish.ingredients.map(ing => ({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit
      }));
      try {
        dish.nutrition = await nutritionCalculator.calculateFromIngredients(ingredientAmounts);
      } catch {
        dish.nutrition = { calories: 0, protein: 0, fat: 0, carbs: 0, salt: 0 };
      }
    } else {
      dish.nutrition = { calories: 0, protein: 0, fat: 0, carbs: 0, salt: 0 };
    }
  }

  return result;
}

/**
 * Progressive generation result - returned immediately with main menu
 */
export interface ProgressiveMenuResult {
  main: GeneratedMenu;
  alternativeA?: GeneratedMenu;
  alternativeB?: GeneratedMenu;
  loading: boolean;
  generationId?: string;
}

/**
 * Generate both alternatives (A and B) in a single API call for cost efficiency
 * Total tokens: 2000 for both combined
 */
async function generateAlternativesTogether(
  ingredients: IngredientWithProduct[],
  userId: string,
  mainMenu: GeneratedMenu,
  options?: { servings?: number; budget?: number | null; mode?: ConstraintMode },
): Promise<{ alternativeA: GeneratedMenu; alternativeB: GeneratedMenu }> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Fetch preferences (reused from single menu function)
  const [preferences, allergies, restrictions] = await Promise.all([
    prisma
      .$queryRaw<UserPreferences[]>`SELECT * FROM "UserPreferences" WHERE "userId" = ${userId} LIMIT 1`
      .then((rows) => (rows.length > 0 ? rows[0] : null)),
    prisma.userAllergy.findMany({ where: { userId } }),
    prisma.userRestriction.findMany({ where: { userId } }),
  ]);

  const taste = (preferences?.tasteJson as TasteJson | null | undefined) ?? {};
  const dayOfWeek = new Date().getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const lifestyle = isWeekend
    ? (taste.lifestyle?.weekendMode ?? taste.lifestyle?.defaultMode ?? {})
    : (taste.lifestyle?.weekdayMode ?? taste.lifestyle?.defaultMode ?? {});
  const servings = options?.servings ?? 1;
  const budget = options?.budget;

  // Build ingredient list
  const ingredientList = ingredients
    .map((i) => {
      let quantity = "";
      if (i.amount) quantity = ` (${i.amount}${i.unit ?? ""})`;
      else if (i.amountLevel) quantity = ` (${i.amountLevel})`;
      let expiry = "";
      if (i.expirationDate) {
        const days = differenceInDays(i.expirationDate, new Date());
        expiry = ` [期限まで${days}日]`;
      }
      return `- ${i.name}${quantity}${expiry}`;
    })
    .join("\n");

  const allergenList = allergies
    .map((a) => a.label ?? a.allergen)
    .filter((s): s is string => typeof s === "string")
    .join(", ");
  const restrictionNote = restrictions
    .map((r) => `${r.type}${r.note ? `: ${r.note}` : ""}`)
    .join("; ");

  const cookingSkill = preferences?.cookingSkill ?? "intermediate";
  const comfortableMethods = Array.isArray(preferences?.comfortableMethods)
    ? (preferences.comfortableMethods as string[]).join(", ")
    : "なし";
  const avoidMethods = Array.isArray(preferences?.avoidMethods)
    ? (preferences.avoidMethods as string[]).join(", ")
    : "なし";
  const equipment = (
    taste.equipment ?? preferences?.kitchenEquipment ?? []
  ).join(", ");

  const bothAlternativesPrompt = `あなたはプロの献立プランナーです。
手持ち食材を使って2つの代替献立を生成してください。

**重要**: main献立とジャンル・味付けが異なる献立を提案してください。
main: "${mainMenu.title}"
mainのタグ: ${mainMenu.tags?.join(", ") ?? "なし"}

# CRITICAL SAFETY RULES
1. NEVER suggest recipes containing these allergens: ${allergenList.length > 0 ? allergenList : "None"}.
2. Adhere to these dietary restrictions: ${restrictionNote || "None"}.

# GENERATION SETTINGS
- Servings: ${servings} person(s)
- Budget Goal: ${budget ? `approx ${budget} yen per serving` : "ignore cost"}

# 手持ち食材
${ingredientList}

# ユーザー情報
- 料理スキル: ${cookingSkill}
- 得意な調理法: ${comfortableMethods}
- 避けたい調理法: ${avoidMethods}
- 設備: ${equipment}
- ライフスタイル優先度: ${lifestyle.timePriority ?? "normal"}

# 出力形式
{
  "alternativeA": {
    "title": "代替案Aのタイトル",
    "reason": "選定理由（mainと異なるジャンルであることを強調）",
    "tags": ["洋食", "時短"],
    "dishes": [
      {
        "type": "主菜",
        "name": "料理名",
        "cookingTime": 25,
        "difficulty": 2,
        "ingredients": [{"name": "食材名", "amount": 200, "unit": "g"}],
        "steps": ["具体的な手順1", "手順2"],
        "tips": "コツ"
      }
    ]
  },
  "alternativeB": {
    "title": "スピード献立",
    "reason": "15分以内で完成する時短献立",
    "tags": ["超時短", "簡単"],
    "dishes": [
      {
        "type": "主菜",
        "name": "料理名",
        "cookingTime": 10,
        "difficulty": 1,
        "ingredients": [{"name": "食材名", "amount": 150, "unit": "g"}],
        "steps": ["手順1", "手順2"],
        "tips": "時短のコツ"
      }
    ]
  }
}

**最重要**: alternativeAはmainと全く異なるジャンル（和食なら洋食等）、alternativeBは調理時間15分以内にしてください。有効なJSONのみ出力。`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: bothAlternativesPrompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 2000, // Both alternatives in 2000 tokens
  });

  const content = completion.choices[0]?.message.content;
  if (!content) {
    throw new Error("AIからの応答が空でした (alternatives)");
  }

  let parsed: { alternativeA?: GeneratedMenu; alternativeB?: GeneratedMenu };
  try {
    parsed = JSON.parse(content);
  } catch (parseError) {
    const repaired = attemptJSONRepair(content);
    parsed = JSON.parse(repaired);
  }

  if (!parsed.alternativeA || !parsed.alternativeB) {
    throw new Error("代替献立の形式が無効です");
  }

  // Calculate nutrition for both
  const nutritionCalculator = new NutritionCalculator();
  
  for (const menu of [parsed.alternativeA, parsed.alternativeB]) {
    if (menu && menu.dishes) {
      for (const dish of menu.dishes) {
        dish.nutrition = undefined;
        if (dish.ingredients && dish.ingredients.length > 0) {
          const ingredientAmounts: IngredientWithAmount[] = dish.ingredients.map(ing => ({
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit
          }));
          try {
            dish.nutrition = await nutritionCalculator.calculateFromIngredients(ingredientAmounts);
          } catch {
            dish.nutrition = { calories: 0, protein: 0, fat: 0, carbs: 0, salt: 0 };
          }
        } else {
          dish.nutrition = { calories: 0, protein: 0, fat: 0, carbs: 0, salt: 0 };
        }
      }
    }
  }

  return {
    alternativeA: parsed.alternativeA,
    alternativeB: parsed.alternativeB,
  };
}

/**
 * Generate menus with optimized token usage (Plan B)
 * - main: 2000 tokens (single call)
 * - alternatives (A+B): 2000 tokens (combined in one call)
 * Total: 4000 tokens, 2 API calls
 */
export async function generateMenusParallel(
  ingredients: IngredientWithProduct[],
  userId: string,
  options?: { servings?: number; budget?: number | null; mode?: ConstraintMode },
): Promise<MenuGenerationResult> {
  // Phase 1: Generate main first (2000 tokens)
  const main = await generateSingleMenuInternal("main", ingredients, userId, options);

  // Phase 2: Generate both alternatives together (2000 tokens total)
  const { alternativeA, alternativeB } = await generateAlternativesTogether(
    ingredients,
    userId,
    main,
    options,
  ).catch((err) => {
    console.warn("[Parallel] Alternatives generation failed, using main fallback:", err);
    const fallback = JSON.parse(JSON.stringify(main)) as GeneratedMenu;
    return {
      alternativeA: fallback,
      alternativeB: fallback,
    };
  });

  return {
    main,
    alternativeA,
    alternativeB,
  };
}
/**
 * Progressive generation - returns main immediately, then alternatives
 * For streaming or polling implementations
 */
export async function generateMenusProgressive(
  ingredients: IngredientWithProduct[],
  userId: string,
  options?: { servings?: number; budget?: number | null; mode?: ConstraintMode },
  onProgress?: (result: ProgressiveMenuResult) => void,
): Promise<MenuGenerationResult> {
  // Generate main first
  const main = await generateSingleMenuInternal("main", ingredients, userId, options);

  if (onProgress) {
    onProgress({
      main,
      loading: true,
    });
  }

  // Then generate both alternatives together (Plan B)
  const { alternativeA, alternativeB } = await generateAlternativesTogether(
    ingredients,
    userId,
    main,
    options,
  ).catch((err) => {
    console.warn("[Progressive] Alternatives failed:", err);
    const fallback = JSON.parse(JSON.stringify(main)) as GeneratedMenu;
    return {
      alternativeA: fallback,
      alternativeB: fallback,
    };
  });

  const result = {
    main,
    alternativeA,
    alternativeB,
  };

  if (onProgress) {
    onProgress({
      ...result,
      loading: false,
    });
  }

  return result;
}

/**
 * In-memory cache for menu generation results
 * Cache key: hash of ingredients + servings + budget + mode
 */
interface MenuCacheEntry {
  ts: number;
  value: MenuGenerationResult;
}

const menuCache = new Map<string, MenuCacheEntry>();
const MENU_CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes

function createMenuCacheKey(
  ingredients: IngredientWithProduct[],
  options?: { servings?: number; budget?: number | null; mode?: string },
): string {
  const ingredientHash = ingredients
    .map((i) => `${i.id}:${i.amount}:${i.expirationDate?.toISOString() ?? "none"}`)
    .sort()
    .join("|");
  return `${ingredientHash}:${options?.servings ?? 1}:${options?.budget ?? "none"}:${options?.mode ?? "flexible"}`;
}

/**
 * Generate menus with caching support
 * Uses parallel generation with in-memory caching
 */
export async function generateMenusCached(
  ingredients: IngredientWithProduct[],
  userId: string,
  options?: { servings?: number; budget?: number | null; mode?: ConstraintMode },
): Promise<{ result: MenuGenerationResult; fromCache: boolean }> {
  const cacheKey = createMenuCacheKey(ingredients, options);
  const cached = menuCache.get(cacheKey);

  if (cached && Date.now() - cached.ts < MENU_CACHE_TTL_MS) {
    console.log("[MenuCache] Cache hit for key:", cacheKey.slice(0, 50) + "...");
    return { result: cached.value, fromCache: true };
  }

  console.log("[MenuCache] Cache miss, generating menus...");
  const result = await generateMenus(ingredients, userId, options);

  menuCache.set(cacheKey, { ts: Date.now(), value: result });

  // Cleanup old entries periodically
  if (menuCache.size > 100) {
    const now = Date.now();
    for (const [key, entry] of menuCache.entries()) {
      if (now - entry.ts > MENU_CACHE_TTL_MS) {
        menuCache.delete(key);
      }
    }
  }

  return { result, fromCache: false };
}
