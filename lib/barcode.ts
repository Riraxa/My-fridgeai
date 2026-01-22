//lib/barcode.ts
import OpenAI from "openai";

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

export type BarcodeProduct = {
  found: boolean;
  name: string | null;
  category: string | null;
  brand: string | null;
  image: string | null;
  expirationDays: number | null; // 推定日数
  source: "openfoodfacts" | "ai" | "none";
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
        "User-Agent": "My-FridgeAI/1.0",
      },
    });

    if (!res.ok) {
      console.warn(`Open Food Facts API error: ${res.status}`);
      return await fallbackToAI(barcode);
    }

    const data = await res.json();

    // status: 0 = 商品が見つからない
    if (data.status === 0) {
      return await fallbackToAI(barcode);
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

    return {
      found: true,
      name,
      category,
      brand: product.brands || null,
      image: product.image_url || product.image_small_url || null,
      expirationDays,
      source: "openfoodfacts",
    };
  } catch (error) {
    console.error("Open Food Facts lookup error:", error);
    return await fallbackToAI(barcode);
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
 * AIフォールバック: バーコード番号から商品を推定
 */
async function fallbackToAI(barcode: string): Promise<BarcodeProduct> {
  try {
    const prompt = `
以下のバーコード番号から、可能性が高い商品を推定してください。

バーコード: ${barcode}

以下のJSON形式で回答してください：
{
  "name": "商品名（日本語）",
  "category": "カテゴリ（乳製品/肉類/魚介類/野菜/果物/穀物/加工食品/冷凍食品/調味料/飲料/デザート/その他）",
  "expirationDays": 推定賞味期限日数（数値）
}

不明な場合は、日本でよく流通する一般的な食品として推定してください。
    `.trim();

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "あなたは日本の食品バーコードに詳しいアシスタントです。バーコード番号から商品情報を推定します。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content || "{}";
    const result = JSON.parse(content);

    return {
      found: true,
      name: result.name || "不明な商品",
      category: result.category || "その他",
      brand: null,
      image: null,
      expirationDays: result.expirationDays || 14,
      source: "ai",
    };
  } catch (error) {
    console.error("AI fallback error:", error);
    return {
      found: false,
      name: null,
      category: null,
      brand: null,
      image: null,
      expirationDays: null,
      source: "none",
    };
  }
}
