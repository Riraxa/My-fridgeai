// GENERATED_BY_AI: 2026-03-18 cascade
import { NutritionInfo, Unit, IngredientWithAmount } from './index';
import { JapaneseFoodDatabase } from './japanese-food-db';

export class NutritionCalculator {
  private japaneseDB = new JapaneseFoodDatabase();

  /**
   * 食材リストから栄養価を計算
   */
  async calculateFromIngredients(ingredients: IngredientWithAmount[]): Promise<NutritionInfo> {
    const nutrition: NutritionInfo = {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      salt: 0,
    };

    for (const ingredient of ingredients) {
      const ingredientNutrition = await this.getIngredientNutrition(ingredient);
      if (ingredientNutrition) {
        const quantityInGrams = this.convertToGrams(ingredient.amount, ingredient.unit, ingredient.name);
        const ratio = quantityInGrams / 100;

        nutrition.calories += Math.floor(ingredientNutrition.calories * ratio);
        nutrition.protein += Number((ingredientNutrition.protein * ratio).toFixed(1));
        nutrition.fat += Number((ingredientNutrition.fat * ratio).toFixed(1));
        nutrition.carbs += Number((ingredientNutrition.carbs * ratio).toFixed(1));
        nutrition.salt += Number(((ingredientNutrition.salt || 0) * ratio).toFixed(2));
      }
    }

    return nutrition;
  }

  /**
   * 個別食材の栄養価を取得
   */
  private async getIngredientNutrition(ingredient: IngredientWithAmount): Promise<NutritionInfo | null> {
    // まず日本食品データベースで検索
    const japaneseFood = await this.japaneseDB.searchFood(ingredient.name);
    if (japaneseFood) {
      return japaneseFood.nutrition;
    }

    // 基本的な栄養価フォールバック
    return this.getBasicNutrition(ingredient.name);
  }

  /**
   * 基本的な栄養価（フォールバック用）
   */
  private getBasicNutrition(foodName: string): NutritionInfo | null {
    const basicNutritionMap: Record<string, NutritionInfo> = {
      '米': { calories: 168, protein: 4.2, fat: 0.5, carbs: 37.1, salt: 0 },
      '鶏肉': { calories: 165, protein: 31, fat: 3.6, carbs: 0, salt: 0.1 },
      '豚肉': { calories: 250, protein: 26, fat: 17, carbs: 0.3, salt: 0.1 },
      '牛肉': { calories: 250, protein: 26, fat: 17, carbs: 0.3, salt: 0.1 },
      '卵': { calories: 151, protein: 12.9, fat: 10.3, carbs: 0.3, salt: 0.3 },
      '豆腐': { calories: 72, protein: 8.1, fat: 4.4, carbs: 1.1, salt: 0.1 },
      '玉ねぎ': { calories: 37, protein: 1, fat: 0.1, carbs: 8.8, salt: 0 },
      '人参': { calories: 37, protein: 0.8, fat: 0.2, carbs: 8.8, salt: 0.1 },
      'キャベツ': { calories: 25, protein: 1.3, fat: 0.2, carbs: 5.2, salt: 0 },
      'じゃがいも': { calories: 76, protein: 1.6, fat: 0.1, carbs: 17.3, salt: 0.1 },
      'トマト': { calories: 19, protein: 0.7, fat: 0.1, carbs: 3.9, salt: 0 },
      'きゅうり': { calories: 14, protein: 0.7, fat: 0.1, carbs: 3, salt: 0.1 },
      '白菜': { calories: 14, protein: 0.8, fat: 0.1, carbs: 3.2, salt: 0.1 },
      'ほうれん草': { calories: 20, protein: 2.2, fat: 0.4, carbs: 3.1, salt: 0.1 },
      '醤油': { calories: 60, protein: 5.5, fat: 0, carbs: 10.1, salt: 14.5 },
      '味噌': { calories: 198, protein: 11.5, fat: 6.5, carbs: 22.3, salt: 8.5 },
      '砂糖': { calories: 384, protein: 0, fat: 0, carbs: 99.9, salt: 0 },
      '油': { calories: 884, protein: 0, fat: 100, carbs: 0, salt: 0 },
      '塩': { calories: 0, protein: 0, fat: 0, carbs: 0, salt: 39 },
      'みりん': { calories: 216, protein: 0.5, fat: 0, carbs: 51.8, salt: 0.1 },
      '酒': { calories: 103, protein: 0.2, fat: 0, carbs: 5.1, salt: 0 },
    };

    // 部分一致検索
    for (const [key, value] of Object.entries(basicNutritionMap)) {
      if (foodName.includes(key) || key.includes(foodName)) {
        return value;
      }
    }

    return null;
  }

  /**
   * 単位をグラムに変換（食材の種類を考慮）
   */
  private convertToGrams(quantity: number, unit: string | Unit, foodName: string = ''): number {
    const unitName = typeof unit === 'string' ? unit : unit.name;

    // 食材ごとの標準的な重さ（1個/1本あたりのg数）
    const itemWeights: Record<string, number> = {
      '卵': 50,
      '玉ねぎ': 200,
      '人参': 150,
      'じゃがいも': 150,
      'トマト': 150,
      'ミニトマト': 15,
      'キャベツ': 1000,
      'レタス': 400,
      '大根': 1000,
      'きゅうり': 100,
      'ピーマン': 30,
      'なす': 80,
      'りんご': 300,
      'バナナ': 150,
      'みかん': 100,
      '豆腐': 350,
      '納豆': 50,
      'パン': 60,
      '食パン': 60,
      '牛乳': 200, // 1杯(200ml)
    };

    // 食材名からマッチする重さを探す
    let standardWeight = 100; // デフォルト 100g
    for (const [name, weight] of Object.entries(itemWeights)) {
      if (foodName.includes(name)) {
        standardWeight = weight;
        break;
      }
    }

    switch (unitName) {
      // 個数系単位
      case '個':
      case '本':
      case '房':
      case '株':
      case '袋':
      case '缶':
      case '匹':
      case '尾':
      case 'パック':
      case '丁':
        return quantity * standardWeight;
      case '枚':
        return quantity * (foodName.includes('肉') ? 20 : 15); // 肉なら20g、パンなら厚みによるが一旦15g
      case '切れ':
        return quantity * 80; // 魚の切り身など

      // 調味料系単位
      case '小さじ':
        return quantity * 5;
      case '大さじ':
        return quantity * 15;
      case 'カップ':
        return quantity * 200;

      // 質量・容量単位
      case 'kg':
        return quantity * 1000;
      case 'g':
        return quantity;
      case 'ml':
        return quantity; 
      case 'L':
        return quantity * 1000;

      // その他
      case '適量':
      case '少々':
        return 2; 

      default:
        // 単位が不明な場合は、数値がそのままg単位である可能性が高い（要件によるが一旦安全側に倒す）
        return quantity > 10 ? quantity : quantity * standardWeight;
    }
  }
}
