export interface AllergenMatch {
  allergen: string;
  foundIn: string;
}

/**
 * AIが生成したレシピの材料リストを走査し、アレルギー物質が含まれていないかチェックします。
 *
 * @param ingredients レシピに含まれる材料名の配列
 * @param allergens ユーザーが登録しているアレルギー物質の配列 (英単語または日本語)
 * @returns 検出されたアレルギー物質の情報。含まれていなければ null。
 */
export function checkAllergens(
  ingredients: string[],
  allergens: string[],
): AllergenMatch | null {
  if (!allergens || allergens.length === 0) return null;

  // 正規化: 小文字化、全角半角の統一（簡易的）
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[！-～]/g, (tmp) =>
        String.fromCharCode(tmp.charCodeAt(0) - 0xfee0),
      );

  const normalizedAllergens = allergens.map(normalize);

  for (const ingredient of ingredients) {
    const normalizedIngredient = normalize(ingredient);

    for (const allergen of normalizedAllergens) {
      // 部分一致でも検出（例：「卵」が「茹で卵」に含まれる）
      // ただし、誤検知（例：「パン」が「パン粉」に含まれるのは正しいが、逆は？）を避けるため
      // 基本的には材料名の中にアレルギーワードが含まれているかを見る
      if (normalizedIngredient.includes(allergen)) {
        return { allergen, foundIn: ingredient };
      }
    }
  }

  return null;
}
