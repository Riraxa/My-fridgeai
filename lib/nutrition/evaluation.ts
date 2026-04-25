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
    proteinRatio: number;
    fatRatio: number;
    carbsRatio: number;
  };
  evaluation: string;
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

  for (const dish of dishes) {
    if (dish.nutrition) {
      total.calories += dish.nutrition.calories ?? 0;
      total.protein += dish.nutrition.protein ?? 0;
      total.fat += dish.nutrition.fat ?? 0;
      total.carbs += dish.nutrition.carbs ?? 0;
    }
  }

  const pCal = total.protein * 4;
  const fCal = total.fat * 9;
  const cCal = total.carbs * 4;
  const totalCal = pCal + fCal + cCal;

  const proteinRatio = totalCal > 0 ? pCal / totalCal : 0;
  const fatRatio = totalCal > 0 ? fCal / totalCal : 0;
  const carbsRatio = totalCal > 0 ? cCal / totalCal : 0;

  const balance = {
    proteinRatio: Number(proteinRatio.toFixed(2)),
    fatRatio: Number(fatRatio.toFixed(2)),
    carbsRatio: Number(carbsRatio.toFixed(2)),
  };

  return {
    total,
    balance,
    evaluation: getPFCBalance(balance),
  };
}

export function getPFCBalance(balance: {
  proteinRatio: number;
  fatRatio: number;
  carbsRatio: number;
}): string {
  const { proteinRatio, fatRatio, carbsRatio } = balance;

  const isProteinOk = proteinRatio >= 0.13 && proteinRatio <= 0.25;
  const isFatOk = fatRatio >= 0.2 && fatRatio <= 0.35;
  const isCarbsOk = carbsRatio >= 0.5 && carbsRatio <= 0.7;

  if (isProteinOk && isFatOk && isCarbsOk) {
    return "素晴らしいバランスの献立です！理想的なPFC比率になっています。";
  }

  const feedbacks: string[] = [];
  if (proteinRatio < 0.13) {
    feedbacks.push("タンパク質を少し追加するとバランスがよくなります。");
  } else if (proteinRatio > 0.3) {
    feedbacks.push("タンパク質が非常に豊富です。副菜で調整も検討を。");
  }
  if (fatRatio > 0.35) {
    feedbacks.push("脂質が少し高めです。揚げ物や肉料理の脂身に注意しましょう。");
  } else if (fatRatio < 0.15) {
    feedbacks.push("良質な脂質（魚やナッツ、オリーブオイル等）が不足気味です。");
  }
  if (carbsRatio > 0.7) {
    feedbacks.push("炭水化物が少し多めです。主食の量を調整するか、食物繊維を増やしましょう。");
  } else if (carbsRatio < 0.45) {
    feedbacks.push("エネルギー源となる炭水化物が控えめです。");
  }

  return feedbacks.length === 0
    ? "概ねバランスの良い献立です。"
    : feedbacks.join(" ");
}
