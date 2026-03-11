// GENERATED_BY_AI: 2026-03-11 Antigravity
// lib/receipt/parser.ts
// Receipt parser: maps OCR text lines to ingredients using dictionary + AI fallback.

import { callOpenAIOnce, extractTextFromResponse, extractJsonFromText } from "@/lib/openai";
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

        if (aiResult.mapped_candidates && aiResult.mapped_candidates.length > 0) {
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
  const match = line.match(/(\d+(?:\.\d+)?)\s*(?:g|kg|ml|L|個|本|枚|袋|パック)/);
  if (match && match[1]) return parseFloat(match[1]);

  // Match "×2" or "x3" patterns
  const multiMatch = line.match(/[×xX]\s*(\d+)/);
  if (multiMatch && multiMatch[1]) return parseInt(multiMatch[1]);

  return null;
}

function extractQuantityUnit(line: string): string | null {
  const match = line.match(/\d+(?:\.\d+)?\s*(g|kg|ml|L|個|本|枚|袋|パック)/);
  if (match && match[1]) return match[1];
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

    const prompt = `あなたはスーパーマーケットのレシートテキスト行を構造化された商品データに変換するアシスタントです。

入力:
- raw_lines: ${JSON.stringify(lines)}
- existing_ingredients: ${JSON.stringify(ingredientSample)}

タスク:
各 raw_line について、以下のJSONを生成してください:
{
  "line": "元のテキスト",
  "normalized_name": "正規化された食材名（例: 若鶏もも肉 300g → 鶏もも肉）",
  "quantity_value": 数値またはnull,
  "quantity_unit": "g" | "kg" | "個" | "本" | "ml" | "L" | "枚" | "袋" | "パック" | null,
  "mapped_candidates": [{"id": "...", "name": "...", "score": 0.0-1.0}],
  "processedCategory": "ingredient" | "processedFood",
  "confidence": 0.0-1.0
}

ルール:
- 金額行、小計・合計行、税金行は除外し、空の結果を返さないでください。もし food item でない行が含まれていたら confidence を 0.1 にしてください。
- existing_ingredients の名前と一致度が 0.8 以上なら mapped_candidates に含めてください。
- 加工食品（カレールー、即席麺、冷凍食品等）は "processedFood"、生鮮食材は "ingredient" としてください。
- JSON配列のみを出力してください。説明文は不要です。`;

    const response = await callOpenAIOnce({
      input: prompt,
      temperature: 0,
      max_output_tokens: 2000,
    }, 20_000);

    const text = extractTextFromResponse(response);
    const jsonStr = extractJsonFromText(text);

    if (!jsonStr) return lines.map(() => null);

    const parsed: AiParsedLine[] = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : lines.map(() => null);
  } catch (e) {
    console.error("AI parse lines error:", e);
    return lines.map(() => null);
  }
}
