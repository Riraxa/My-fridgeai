// GENERATED_BY_AI: 2026-03-11 Antigravity
// lib/receipt/parser.ts
// Receipt parser: maps OCR text lines to ingredients using dictionary + AI fallback.

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { prisma } from "@/lib/prisma";

export interface ParsedReceiptItem {
  lineText: string;
  productName: string | null;
  normalizedName: string | null;
  mappedIngredientId: string | null;
  mappedIngredientName: string | null;
  quantityValue: number | null;
  quantityUnit: string | null;
  inferredLevel: string | null;
  processedCategory: "ingredient" | "processedFood" | null;
  confidenceScore: number;
}

/**
 * Parse product lines from a receipt using dictionary lookup + AI fallback.
 */
export async function parseReceiptLines(
  productLines: string[],
  userId: string,
): Promise<ParsedReceiptItem[]> {
  if (productLines.length === 0) return [];

  // 1. Load existing ingredients for dictionary matching
  const existingIngredients = await prisma.ingredient.findMany({
    where: { userId },
    select: { id: true, name: true, category: true },
    take: 500,
  });

  // 2. Try dictionary matching first
  const results: ParsedReceiptItem[] = [];
  const unmatchedLines: { index: number; line: string }[] = [];

  for (let i = 0; i < productLines.length; i++) {
    const line = productLines[i]!;
    const dictMatch = dictionaryMatch(line, existingIngredients);

    if (dictMatch && dictMatch.score >= 0.85) {
      results[i] = {
        lineText: line,
        productName: line,
        normalizedName: dictMatch.name,
        mappedIngredientId: dictMatch.id,
        mappedIngredientName: dictMatch.name,
        quantityValue: extractQuantityValue(line),
        quantityUnit: extractQuantityUnit(line),
        inferredLevel: "normal",
        processedCategory: "ingredient",
        confidenceScore: dictMatch.score,
      };
    } else {
      unmatchedLines.push({ index: i, line });
      // placeholder
      results[i] = {
        lineText: line,
        productName: null,
        normalizedName: null,
        mappedIngredientId: null,
        mappedIngredientName: null,
        quantityValue: null,
        quantityUnit: null,
        inferredLevel: null,
        processedCategory: null,
        confidenceScore: 0,
      };
    }
  }

  // 3. AI fallback for unmatched lines (batch)
  if (unmatchedLines.length > 0) {
    const aiResults = await aiParseLines(
      unmatchedLines.map((u) => u.line),
      existingIngredients,
    );

    for (let j = 0; j < unmatchedLines.length; j++) {
      const unmatchedEntry = unmatchedLines[j];
      if (!unmatchedEntry) continue;
      const idx = unmatchedEntry.index;
      const aiResult = aiResults[j];
      if (aiResult) {
        // Try to resolve mapped ingredient from AI suggestion
        let mappedId: string | null = null;
        let mappedName: string | null = null;

        if (aiResult.mapped_candidates?.length > 0) {
          const best = aiResult.mapped_candidates[0];
          if (best && best.score >= 0.7) {
            mappedId = best.id;
            mappedName = best.name;
          }
        }

        results[idx] = {
          lineText: unmatchedEntry.line,
          productName: aiResult.line ?? unmatchedEntry.line,
          normalizedName: aiResult.normalized_name ?? null,
          mappedIngredientId: mappedId,
          mappedIngredientName: mappedName,
          quantityValue: aiResult.quantity_value ?? null,
          quantityUnit: aiResult.quantity_unit ?? null,
          inferredLevel: "normal",
          processedCategory: aiResult.processedCategory ?? null,
          confidenceScore: aiResult.confidence ?? 0.5,
        };
      }
    }
  }

  return results;
}

// --- Dictionary matching ---

function dictionaryMatch(
  line: string,
  ingredients: { id: string; name: string; category: string | null }[],
): { id: string; name: string; score: number } | null {
  const normalizedLine = line
    .replace(/[\s　]+/g, "")
    .replace(/[¥￥]\d+/g, "")
    .replace(/\d+[個本枚袋パック]/g, "")
    .toLowerCase();

  let bestMatch: { id: string; name: string; score: number } | null = null;

  for (const ing of ingredients) {
    const normalizedName = ing.name.replace(/[\s　]+/g, "").toLowerCase();

    // Exact match
    if (normalizedLine.includes(normalizedName) || normalizedName.includes(normalizedLine)) {
      const score = normalizedName.length / Math.max(normalizedLine.length, 1);
      const finalScore = Math.min(score, 1.0);
      if (!bestMatch || finalScore > bestMatch.score) {
        bestMatch = { id: ing.id, name: ing.name, score: Math.max(finalScore, 0.85) };
      }
    }
  }

  return bestMatch;
}

// --- Quantity extraction helpers ---

function extractQuantityValue(line: string): number | null {
  // Match patterns like "300g", "1.5kg", "2個", "3本"
  const match = line.match(/(\d+(?:\.\d+)?)\s*(?:g|kg|ml|L|個|本|枚|袋|パック|dl|dL)/);
  if (match?.[1]) return parseFloat(match[1]);

  // Match "×2" or "x3" patterns
  const multiMatch = line.match(/[×xX]\s*(\d+)/);
  if (multiMatch?.[1]) return parseInt(multiMatch[1]);

  // Match price patterns with quantity like "198円(2個)" 
  const priceMatch = line.match(/\d+\s*円\s*[\(（]\s*(\d+(?:\.\d+)?)\s*(?:個|本|枚|袋|パック)\s*[\)）]/);
  if (priceMatch?.[1]) return parseFloat(priceMatch[1]);

  // Match standalone numbers at end of line (assume quantity)
  const numberMatch = line.match(/(\d+(?:\.\d+)?)\s*$/);
  if (numberMatch?.[1]) {
    const num = parseFloat(numberMatch[1]);
    // Only return if it's a reasonable quantity (less than 1000)
    if (num > 0 && num < 1000) return num;
  }

  return null;
}

function extractQuantityUnit(line: string): string | null {
  const match = line.match(/\d+(?:\.\d+)?\s*(g|kg|ml|L|個|本|枚|袋|パック|dl|dL)/);
  if (match?.[1]) return match[1];

  // Check price patterns for units
  const priceMatch = line.match(/\d+\s*円\s*[\(（]\s*\d+(?:\.\d+)?\s*(個|本|枚|袋|パック)\s*[\)）]/);
  if (priceMatch?.[1]) return priceMatch[1];

  // Default to "個" for standalone numbers
  const numberMatch = line.match(/(\d+(?:\.\d+)?)\s*$/);
  if (numberMatch?.[1]) return "個";

  return null;
}

// --- AI fallback ---

interface AiParsedLine {
  line: string;
  normalized_name: string | null;
  quantity_value: number | null;
  quantity_unit: string | null;
  mapped_candidates: { id: string; name: string; score: number }[];
  processedCategory: "ingredient" | "processedFood" | null;
  confidence: number;
}

async function aiParseLines(
  lines: string[],
  existingIngredients: { id: string; name: string; category: string | null }[],
): Promise<(AiParsedLine | null)[]> {
  try {
    const ingredientSample = existingIngredients
      .slice(0, 50)
      .map((i) => ({ id: i.id, name: i.name }));

    const AiParsedLineSchema = z.object({
      line: z.string(),
      normalized_name: z.string().nullable(),
      quantity_value: z.number().nullable(),
      quantity_unit: z.enum(['g', 'kg', 'ml', 'L', '個', '本', '枚', '袋', 'パック', 'dl', 'dL']).nullable(),
      estimated_expiration_days: z.number().int(),
      category: z.enum(['冷蔵', '冷凍', '野菜', '調味料', '加工食品', 'その他']),
      mapped_candidates: z.array(z.object({
        id: z.string(),
        name: z.string(),
        score: z.number(),
      })),
      processedCategory: z.enum(['ingredient', 'processedFood']).nullable(),
      confidence: z.number(),
    });

    const prompt = `あなたはスーパーマーケットのレシートテキスト行を構造化された商品データに変換するアシスタントです。

入力:
- raw_lines: ${JSON.stringify(lines)}
- existing_ingredients: ${JSON.stringify(ingredientSample)}

タスク:
各 raw_line について、以下のJSONを必ず1つずつ、入力と同じ順番で配列として生成してください:
{
  "line": "元のテキスト",
  "normalized_name": "正規化された食材名",
  "quantity_value": 数値（標準的な購入単位を考慮し、空欄でも推論してください）,
  "quantity_unit": "g" | "ml" | "L" | "個" | "本" | "枚" | "袋" | "パック" | "dl" | null,
  "estimated_expiration_days": 購入日からの賞味期限日数（整数）,
  "category": "冷蔵" | "冷凍" | "野菜" | "調味料" | "加工食品" | "その他",
  "mapped_candidates": [{"id": "...", "name": "...", "score": 0.0-1.0}],
  "processedCategory": "ingredient" | "processedFood",
  "confidence": 0.0-1.0
}

ルール:
- 【数量・単位の推論】:
  - 明記されている場合は正確に抽出してください
  - "198円(2個)" のような価格表記から数量を推論してください
  - "牛乳 1000ml" の場合は数量:1000, 単位:"ml" としてください
  - "卵 10個" の場合は数量:10, 単位:"個" としてください
  - 明記されていない場合も、食材であれば標準的な購入サイズを推論してください
    - 例: 牛乳 -> 1000 ml, 卵 -> 10 個, 納豆 -> 50 g (または 3個), パン -> 1個
  - 曖昧な単位は「g」「ml」「個」などの物理単位に極力変換してください
- 【賞味期限の推定】: 食材の性質から標準的な賞味期限（日数）を推定してください。
  - 肉・魚: 3-5日, 野菜: 5-14日, 乳製品: 7-14日, 調味料: 90日以上, 乾物: 180日以上。
- 食材名以外のテキスト（「領収証」、「No...」等）は confidence を 0.0 にしてください。
- ブランド名（「日清」等）は normalized_name に含めてください。
- 入力が商品でない場合も、confidence: 0.0 のJSONオブジェクトを必ず返し、インデックスを維持してください。
- JSON配列のみを出力してください。`;

    const { object: result } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.array(AiParsedLineSchema),
      prompt,
      temperature: 0,
    });

    return Array.isArray(result) ? result : lines.map(() => null);
  } catch (e) {
    console.error("AI parse lines error:", e);
    if (e instanceof Error && e.message.includes("timed out")) {
      console.error("AI processing timeout - returning partial results");
    }
    return lines.map(() => null);
  }
}
