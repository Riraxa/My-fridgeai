//lib/barcode.ts

export type IngredientType = "raw" | "processed_base" | "instant_complete";

export type BarcodeProduct = {
  found: boolean;
  name: string | null;
  category: string | null;
  brand: string | null;
  image: string | null;
  expirationDays: number | null; // 推定日数
  source: "openfoodfacts" | "none";
  ingredientType: IngredientType;
  requiresAdditionalIngredients: { name: string; amount: number; unit: string }[];
};

/**
 * Open Food Facts APIでバーコード検索
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeProduct> {
  try {
    // APIバージョン v2 を使用（日本語対応強化）
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "My-fridgeai/1.0",
      },
    });

    if (!res.ok) {
      console.warn(`Open Food Facts API error: ${res.status}`);
      return {
        found: false,
        name: null,
        category: null,
        brand: null,
        image: null,
        expirationDays: null,
        source: "none",
        ingredientType: "raw",
        requiresAdditionalIngredients: [],
      };
    }

    const data = await res.json();

    // status: 0 = 商品が見つからない
    if (data.status === 0) {
      return {
        found: false,
        name: null,
        category: null,
        brand: null,
        image: null,
        expirationDays: null,
        source: "none",
        ingredientType: "raw",
        requiresAdditionalIngredients: [],
      };
    }

    const product = data.product;

    // 商品名の取得（日本語優先）
    const name =
      product.product_name_ja ||
      product.product_name ||
      product.generic_name_ja ||
      product.generic_name ||
      "不明な商品";

    // カテゴリの推定
    const category = extractCategory(product.categories_tags || []);

    // 賞味期限の推定
    const expirationDays = estimateExpirationDays(
      category,
      product.categories_tags || [],
    );

    // 加工食品タイプの判定
    const { ingredientType, requiresAdditionalIngredients } =
      detectIngredientType(name, product.categories_tags || [], category);

    return {
      found: true,
      name,
      category,
      brand: product.brands || null,
      image: product.image_url || product.image_small_url || null,
      expirationDays,
      source: "openfoodfacts",
      ingredientType,
      requiresAdditionalIngredients,
    };
  } catch (error) {
    console.error("Open Food Facts lookup error:", error);
    return {
      found: false,
      name: null,
      category: null,
      brand: null,
      image: null,
      expirationDays: null,
      source: "none",
      ingredientType: "raw",
      requiresAdditionalIngredients: [],
    };
  }
}

/**
 * カテゴリタグから日本の食材カテゴリを推定
 */
function extractCategory(tags: string[]): string {
  const categoryMap: Record<string, string> = {
    "en:beverages": "飲料",
    "en:dairy": "乳製品",
    "en:meats": "肉類",
    "en:plant-based-foods": "野菜・果物",
    "en:vegetables": "野菜",
    "en:fruits": "果物",
    "en:cereals-and-potatoes": "穀物",
    "en:fish": "魚介類",
    "en:seafood": "魚介類",
    "en:snacks": "加工食品",
    "en:desserts": "デザート",
    "en:frozen-foods": "冷凍食品",
    "en:condiments": "調味料",
  };

  for (const tag of tags) {
    const normalized = tag.toLowerCase();
    for (const [key, value] of Object.entries(categoryMap)) {
      if (normalized.includes(key)) {
        return value;
      }
    }
  }

  return "その他";
}

/**
 * カテゴリから賞味期限日数を推定
 */
function estimateExpirationDays(
  category: string,
  tags: string[],
): number | null {
  // カテゴリベースの推定
  const categoryDays: Record<string, number> = {
    乳製品: 5,
    肉類: 3,
    魚介類: 2,
    "野菜・果物": 7,
    野菜: 7,
    果物: 5,
    穀物: 30,
    加工食品: 30,
    冷凍食品: 90,
    調味料: 180,
    飲料: 30,
    デザート: 3,
  };

  if (categoryDays[category]) {
    return categoryDays[category];
  }

  // タグベースの補完
  const tagsStr = tags.join(" ").toLowerCase();
  if (tagsStr.includes("fresh") || tagsStr.includes("refrigerated")) {
    return 3;
  }
  if (tagsStr.includes("frozen")) {
    return 90;
  }
  if (tagsStr.includes("canned") || tagsStr.includes("preserved")) {
    return 180;
  }

  return 14; // デフォルト2週間
}

/**
 * 商品名・カテゴリタグから加工食品タイプを判定
 */
function detectIngredientType(
  name: string,
  tags: string[],
  category: string,
): {
  ingredientType: IngredientType;
  requiresAdditionalIngredients: { name: string; amount: number; unit: string }[];
} {
  const nameLower = name.toLowerCase();
  const tagsStr = tags.join(" ").toLowerCase();

  // instant_complete: 単体で完成する商品
  const instantPatterns = [
    "即席", "インスタント", "カップ麺", "カップヌードル",
    "レトルト", "缶詰", "缶スープ", "味噌汁", "みそ汁",
    "スープ", "お茶漬け", "ふりかけ", "佃煮",
    "冷凍食品", "冷凍餃子", "冷凍ピザ", "レンジ",
    "instant", "ready-to-eat", "microwave",
  ];

  for (const pattern of instantPatterns) {
    if (nameLower.includes(pattern)) {
      return {
        ingredientType: "instant_complete",
        requiresAdditionalIngredients: [],
      };
    }
  }

  // processed_base: 他食材と調合する商品
  const processedBasePatterns: {
    pattern: string;
    additionalIngredients: { name: string; amount: number; unit: string }[];
  }[] = [
      {
        pattern: "カレールー",
        additionalIngredients: [
          { name: "玉ねぎ", amount: 2, unit: "個" },
          { name: "じゃがいも", amount: 2, unit: "個" },
          { name: "にんじん", amount: 1, unit: "本" },
          { name: "肉", amount: 200, unit: "g" },
        ],
      },
      {
        pattern: "カレー",
        additionalIngredients: [
          { name: "玉ねぎ", amount: 2, unit: "個" },
          { name: "肉", amount: 200, unit: "g" },
        ],
      },
      {
        pattern: "シチュー",
        additionalIngredients: [
          { name: "玉ねぎ", amount: 1, unit: "個" },
          { name: "じゃがいも", amount: 2, unit: "個" },
          { name: "にんじん", amount: 1, unit: "本" },
          { name: "肉", amount: 200, unit: "g" },
        ],
      },
      {
        pattern: "麻婆豆腐",
        additionalIngredients: [
          { name: "豆腐", amount: 1, unit: "丁" },
          { name: "ひき肉", amount: 100, unit: "g" },
        ],
      },
      {
        pattern: "ルー",
        additionalIngredients: [
          { name: "玉ねぎ", amount: 1, unit: "個" },
          { name: "肉", amount: 200, unit: "g" },
        ],
      },
      {
        pattern: "の素",
        additionalIngredients: [],
      },
      {
        pattern: "たれ",
        additionalIngredients: [],
      },
      {
        pattern: "ソース",
        additionalIngredients: [],
      },
      {
        pattern: "ペースト",
        additionalIngredients: [],
      },
      {
        pattern: "ミックス",
        additionalIngredients: [],
      },
      {
        pattern: "mix",
        additionalIngredients: [],
      },
    ];

  for (const { pattern, additionalIngredients } of processedBasePatterns) {
    if (nameLower.includes(pattern)) {
      return {
        ingredientType: "processed_base",
        requiresAdditionalIngredients: additionalIngredients,
      };
    }
  }

  // タグベースのチェック
  if (
    tagsStr.includes("en:sauces") ||
    tagsStr.includes("en:condiments") ||
    tagsStr.includes("en:cooking-helpers") ||
    tagsStr.includes("en:meal-kits")
  ) {
    return {
      ingredientType: "processed_base",
      requiresAdditionalIngredients: [],
    };
  }

  if (
    tagsStr.includes("en:meals") ||
    tagsStr.includes("en:prepared-meals") ||
    tagsStr.includes("en:instant")
  ) {
    return {
      ingredientType: "instant_complete",
      requiresAdditionalIngredients: [],
    };
  }

  // デフォルト: 通常食材
  return {
    ingredientType: "raw",
    requiresAdditionalIngredients: [],
  };
}
