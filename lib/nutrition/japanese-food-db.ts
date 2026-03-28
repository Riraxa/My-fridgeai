// GENERATED_BY_AI: 2026-03-18 cascade
import { FoodNutrition } from './index';

/**
 * 日本食品標準成分表データベース
 * 主要な日本食材の栄養価を提供
 */
export class JapaneseFoodDatabase {
  private foods: FoodNutrition[] = [
    // 穀類
    { id: 'rice_white', name: '精白米', category: '穀類', nutrition: { calories: 168, protein: 4.2, fat: 0.5, carbs: 37.1, salt: 0 } },
    { id: 'rice_brown', name: '玄米', category: '穀類', nutrition: { calories: 165, protein: 4.1, fat: 2.1, carbs: 35.1, salt: 0 } },
    { id: 'bread', name: '食パン', category: '穀類', nutrition: { calories: 264, protein: 9.3, fat: 3.5, carbs: 48.8, salt: 1.3 } },
    { id: 'noodles_soba', name: 'そば', category: '穀類', nutrition: { calories: 132, protein: 4.8, fat: 0.8, carbs: 26.8, salt: 0.1 } },
    { id: 'noodles_udon', name: 'うどん', category: '穀類', nutrition: { calories: 105, protein: 2.6, fat: 0.4, carbs: 22.2, salt: 0.2 } },
    { id: 'noodles_ramen', name: 'ラーメン', category: '穀類', nutrition: { calories: 149, protein: 4.5, fat: 2.1, carbs: 28.5, salt: 0.6 } },

    // 肉類
    { id: 'chicken_breast', name: '鶏むね肉', category: '肉類', nutrition: { calories: 165, protein: 31, fat: 3.6, carbs: 0, salt: 0.1 } },
    { id: 'chicken_thigh', name: '鶏もも肉', category: '肉類', nutrition: { calories: 204, protein: 17.3, fat: 14.6, carbs: 0, salt: 0.1 } },
    { id: 'pork_loin', name: '豚ロース', category: '肉類', nutrition: { calories: 250, protein: 26, fat: 17, carbs: 0.3, salt: 0.1 } },
    { id: 'pork_belly', name: '豚ばら', category: '肉類', nutrition: { calories: 395, protein: 12.1, fat: 38.1, carbs: 0.3, salt: 0.1 } },
    { id: 'beef_loin', name: '牛ロース', category: '肉類', nutrition: { calories: 250, protein: 26, fat: 17, carbs: 0.3, salt: 0.1 } },
    { id: 'ground_meat', name: 'ひき肉', category: '肉類', nutrition: { calories: 223, protein: 19.5, fat: 15, carbs: 0.2, salt: 0.1 } },

    // 魚介類
    { id: 'salmon', name: '鮭', category: '魚介類', nutrition: { calories: 204, protein: 22.3, fat: 12.1, carbs: 0.1, salt: 0.1 } },
    { id: 'tuna', name: 'まぐろ', category: '魚介類', nutrition: { calories: 125, protein: 26.4, fat: 1.4, carbs: 0.1, salt: 0.1 } },
    { id: 'sardine', name: 'いわし', category: '魚介類', nutrition: { calories: 217, protein: 20.9, fat: 13.7, carbs: 0.1, salt: 0.2 } },
    { id: 'shrimp', name: 'えび', category: '魚介類', nutrition: { calories: 85, protein: 18.4, fat: 1.1, carbs: 0.3, salt: 0.2 } },
    { id: 'squid', name: 'いか', category: '魚介類', nutrition: { calories: 92, protein: 17.8, fat: 1.4, carbs: 1.1, salt: 0.3 } },
    { id: 'tako', name: 'たこ', category: '魚介類', nutrition: { calories: 76, protein: 16.4, fat: 0.7, carbs: 0.5, salt: 0.5 } },

    // 卵・大豆製品
    { id: 'egg', name: '卵', category: '卵・大豆製品', nutrition: { calories: 151, protein: 12.9, fat: 10.3, carbs: 0.3, salt: 0.3 } },
    { id: 'tofu_silk', name: '絹豆腐', category: '卵・大豆製品', nutrition: { calories: 62, protein: 5.3, fat: 3.9, carbs: 2.1, salt: 0.1 } },
    { id: 'tofu_cotton', name: '木綿豆腐', category: '卵・大豆製品', nutrition: { calories: 72, protein: 8.1, fat: 4.4, carbs: 1.1, salt: 0.1 } },
    { id: 'natto', name: '納豆', category: '卵・大豆製品', nutrition: { calories: 190, protein: 16.5, fat: 10, carbs: 12.1, salt: 0.1 } },
    { id: 'miso', name: '味噌', category: '卵・大豆製品', nutrition: { calories: 198, protein: 11.5, fat: 6.5, carbs: 22.3, salt: 8.5 } },

    // 野菜類
    { id: 'onion', name: '玉ねぎ', category: '野菜類', nutrition: { calories: 37, protein: 1, fat: 0.1, carbs: 8.8, salt: 0 } },
    { id: 'carrot', name: '人参', category: '野菜類', nutrition: { calories: 37, protein: 0.8, fat: 0.2, carbs: 8.8, salt: 0.1 } },
    { id: 'cabbage', name: 'キャベツ', category: '野菜類', nutrition: { calories: 25, protein: 1.3, fat: 0.2, carbs: 5.2, salt: 0 } },
    { id: 'potato', name: 'じゃがいも', category: '野菜類', nutrition: { calories: 76, protein: 1.6, fat: 0.1, carbs: 17.3, salt: 0.1 } },
    { id: 'tomato', name: 'トマト', category: '野菜類', nutrition: { calories: 19, protein: 0.7, fat: 0.1, carbs: 3.9, salt: 0 } },
    { id: 'cucumber', name: 'きゅうり', category: '野菜類', nutrition: { calories: 14, protein: 0.7, fat: 0.1, carbs: 3, salt: 0.1 } },
    { id: 'chinese_cabbage', name: '白菜', category: '野菜類', nutrition: { calories: 14, protein: 0.8, fat: 0.1, carbs: 3.2, salt: 0.1 } },
    { id: 'spinach', name: 'ほうれん草', category: '野菜類', nutrition: { calories: 20, protein: 2.2, fat: 0.4, carbs: 3.1, salt: 0.1 } },
    { id: 'daikon', name: '大根', category: '野菜類', nutrition: { calories: 18, protein: 0.5, fat: 0.1, carbs: 4.1, salt: 0.1 } },
    { id: 'negi', name: 'ねぎ', category: '野菜類', nutrition: { calories: 28, protein: 0.5, fat: 0.1, carbs: 7, salt: 0.1 } },
    { id: 'nasu', name: 'なす', category: '野菜類', nutrition: { calories: 22, protein: 1, fat: 0.1, carbs: 5.1, salt: 0 } },
    { id: 'piman', name: 'ピーマン', category: '野菜類', nutrition: { calories: 22, protein: 0.9, fat: 0.1, carbs: 5.1, salt: 0 } },

    // きのこ類
    { id: 'shiitake', name: 'しいたけ', category: 'きのこ類', nutrition: { calories: 19, protein: 3, fat: 0.4, carbs: 3.9, salt: 0 } },
    { id: 'enoki', name: 'えのき', category: 'きのこ類', nutrition: { calories: 22, protein: 2.7, fat: 0.2, carbs: 4.9, salt: 0 } },
    { id: 'shimeji', name: 'しめじ', category: 'きのこ類', nutrition: { calories: 18, protein: 2.7, fat: 0.4, carbs: 3.6, salt: 0 } },

    // 海藻類
    { id: 'wakame', name: 'わかめ', category: '海藻類', nutrition: { calories: 24, protein: 1.9, fat: 0.3, carbs: 4.5, salt: 2.3 } },
    { id: 'kombu', name: '昆布', category: '海藻類', nutrition: { calories: 144, protein: 7.6, fat: 1.5, carbs: 27.4, salt: 7.8 } },
    { id: 'nori', name: 'のり', category: '海藻類', nutrition: { calories: 188, protein: 35.6, fat: 3.7, carbs: 28.1, salt: 5.8 } },

    // 調味料
    { id: 'soy_sauce', name: '醤油', category: '調味料', nutrition: { calories: 60, protein: 5.5, fat: 0, carbs: 10.1, salt: 14.5 } },
    { id: 'sugar', name: '砂糖', category: '調味料', nutrition: { calories: 384, protein: 0, fat: 0, carbs: 99.9, salt: 0 } },
    { id: 'oil', name: '油', category: '調味料', nutrition: { calories: 884, protein: 0, fat: 100, carbs: 0, salt: 0 } },
    { id: 'salt', name: '塩', category: '調味料', nutrition: { calories: 0, protein: 0, fat: 0, carbs: 0, salt: 39 } },
    { id: 'mirin', name: 'みりん', category: '調味料', nutrition: { calories: 216, protein: 0.5, fat: 0, carbs: 51.8, salt: 0.1 } },
    { id: 'sake', name: '酒', category: '調味料', nutrition: { calories: 103, protein: 0.2, fat: 0, carbs: 5.1, salt: 0 } },
    { id: 'vinegar', name: '酢', category: '調味料', nutrition: { calories: 14, protein: 0.2, fat: 0, carbs: 2.9, salt: 0 } },
    { id: 'mayonnaise', name: 'マヨネーズ', category: '調味料', nutrition: { calories: 688, protein: 1.2, fat: 75.3, carbs: 0.6, salt: 0.3 } },

    // 乳製品
    { id: 'milk', name: '牛乳', category: '乳製品', nutrition: { calories: 61, protein: 3.3, fat: 3.4, carbs: 4.7, salt: 0.1 } },
    { id: 'cheese', name: 'チーズ', category: '乳製品', nutrition: { calories: 380, protein: 25.3, fat: 29.9, carbs: 1.3, salt: 2 } },
    { id: 'yogurt', name: 'ヨーグルト', category: '乳製品', nutrition: { calories: 62, protein: 3.5, fat: 3.5, carbs: 4.7, salt: 0.1 } },

    // 果物
    { id: 'apple', name: 'りんご', category: '果物', nutrition: { calories: 54, protein: 0.1, fat: 0.2, carbs: 14.5, salt: 0 } },
    { id: 'banana', name: 'バナナ', category: '果物', nutrition: { calories: 86, protein: 1.1, fat: 0.1, carbs: 22.5, salt: 0 } },
    { id: 'orange', name: 'みかん', category: '果物', nutrition: { calories: 49, protein: 0.9, fat: 0.1, carbs: 12.1, salt: 0 } },
    { id: 'strawberry', name: 'いちご', category: '果物', nutrition: { calories: 34, protein: 0.6, fat: 0.1, carbs: 8.3, salt: 0 } },
  ];

  /**
   * 食材名で検索
   */
  searchFood(foodName: string): FoodNutrition | null {
    // 完全一致
    const exactMatch = this.foods.find(food => food.name === foodName);
    if (exactMatch) return exactMatch;

    // 部分一致
    const partialMatch = this.foods.find(food => 
      food.name.includes(foodName) || foodName.includes(food.name)
    );
    if (partialMatch) return partialMatch;

    // あいまい検索（カタカナ/ひらがな変換）
    const hiraganaName = this.toHiragana(foodName);
    const fuzzyMatch = this.foods.find(food => {
      const foodHiragana = this.toHiragana(food.name);
      return foodHiragana.includes(hiraganaName) || hiraganaName.includes(foodHiragana);
    });

    return fuzzyMatch ?? null;
  }

  /**
   * カタカナをひらがなに変換
   */
  private toHiragana(text: string): string {
    return text.replace(/[ァ-ヶ]/g, (match) => {
      const code = match.charCodeAt(0);
      return String.fromCharCode(code - 0x60);
    });
  }

  /**
   * カテゴリーで検索
   */
  getByCategory(category: string): FoodNutrition[] {
    return this.foods.filter(food => food.category === category);
  }

  /**
   * 全食品リストを取得
   */
  getAllFoods(): FoodNutrition[] {
    return this.foods;
  }
}
