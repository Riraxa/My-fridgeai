//lib/nutrition.ts
export interface NutritionInfo {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface DishWithNutrition {
  name: string;
  nutrition?: NutritionInfo;
  [key: string]: unknown;
}

export interface NutritionEvaluation {
  total: NutritionInfo;
  balance: {
    proteinRatio: number; // P% (0.0 - 1.0)
    fatRatio: number; // F% (0.0 - 1.0)
    carbsRatio: number; // C% (0.0 - 1.0)
  };
  evaluation: string; // "バランスが良い" etc.
}

export function evaluateNutrition(
  dishes: DishWithNutrition[],
): NutritionEvaluation {
  if (!Array.isArray(dishes)) {
    return {
      total: { calories: 0, protein: 0, fat: 0, carbs: 0 },
      balance: { proteinRatio: 0, fatRatio: 0, carbsRatio: 0 },
      evaluation: "データがありません",
    };
  }
  const total: NutritionInfo = {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
  };

  // Sum up all nutrition from dishes
  for (const dish of dishes) {
    if (dish.nutrition) {
      total.calories += dish.nutrition.calories ?? 0;
      total.protein += dish.nutrition.protein ?? 0;
      total.fat += dish.nutrition.fat ?? 0;
      total.carbs += dish.nutrition.carbs ?? 0;
    }
  }

  // Calculate PFC ratios
  // 1g Protein = 4kcal, 1g Fat = 9kcal, 1g Carb = 4kcal
  const pCal = total.protein * 4;
  const fCal = total.fat * 9;
  const cCal = total.carbs * 4;
  const totalCal = pCal + fCal + cCal;

  const proteinRatio = totalCal > 0 ? pCal / totalCal : 0;
  const fatRatio = totalCal > 0 ? fCal / totalCal : 0;
  const carbsRatio = totalCal > 0 ? cCal / totalCal : 0;

  const balance = {
    proteinRatio: parseFloat(proteinRatio.toFixed(2)),
    fatRatio: parseFloat(fatRatio.toFixed(2)),
    carbsRatio: parseFloat(carbsRatio.toFixed(2)),
  };

  // Evaluation Comment
  const evaluation = getPFCBalance(balance);

  return {
    total,
    balance,
    evaluation,
  };
}

export function getPFCBalance(balance: {
  proteinRatio: number;
  fatRatio: number;
  carbsRatio: number;
}): string {
  const { proteinRatio, fatRatio, carbsRatio } = balance;

  // Ideal (roughly): P 13-20%, F 20-30%, C 50-65% (Japanese Ministry of Health, Labour and Welfare target for 18-49y)
  // User request: P 15-25%, F 20-30%, C 50-60%

  if (
    proteinRatio >= 0.13 &&
    proteinRatio <= 0.25 &&
    fatRatio >= 0.2 &&
    fatRatio <= 0.3 &&
    carbsRatio >= 0.5 &&
    carbsRatio <= 0.65
  ) {
    return "バランスが良い献立です！";
  }

  if (fatRatio > 0.35) {
    return "脂質が少し多めです。";
  }

  if (carbsRatio > 0.65) {
    return "炭水化物が多めです。";
  }

  if (proteinRatio < 0.13) {
    return "タンパク質が不足気味です。";
  }

  return "栄養バランスを意識しましょう。";
}
