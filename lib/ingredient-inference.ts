// lib/ingredient-inference.ts
import { IngredientType } from "@prisma/client";

export interface InferredTypeResult {
    ingredientType: IngredientType;
    requiresAdditionalIngredients: { name: string; amount: number; unit: string }[];
}

/**
 * 推定ロジック: 食材名から加工食品タイプを判定する
 */
export function inferIngredientType(name: string): InferredTypeResult {
    const nameLower = name.toLowerCase();

    // 1. instant_complete: 単体で完成する商品
    const instantPatterns = [
        "即席", "インスタント", "カップ麺", "カップヌードル",
        "レトルト", "缶詰", "缶スープ", "味噌汁", "みそ汁",
        "スープ", "お茶漬け", "ふりかけ", "佃煮",
        "冷凍食品", "冷凍餃子", "冷凍ピザ", "レンジ",
        "パックごはん", "レトルトカレー", "惣菜",
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

    // 2. processed_base: 他食材と調合する商品（料理の素、ルーなど）
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
                pattern: "シチューの素",
                additionalIngredients: [
                    { name: "玉ねぎ", amount: 1, unit: "個" },
                    { name: "じゃがいも", amount: 2, unit: "個" },
                    { name: "にんじん", amount: 1, unit: "本" },
                    { name: "肉", amount: 200, unit: "g" },
                ],
            },
            {
                pattern: "麻婆豆腐の素",
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
        ];

    for (const { pattern, additionalIngredients } of processedBasePatterns) {
        if (nameLower.includes(pattern)) {
            return {
                ingredientType: "processed_base",
                requiresAdditionalIngredients: additionalIngredients,
            };
        }
    }

    // 3. デフォルト: 通常食材
    return {
        ingredientType: "raw",
        requiresAdditionalIngredients: [],
    };
}
