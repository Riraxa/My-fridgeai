import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { addDays, format } from 'date-fns';

const ExtractedIngredientSchema = z.object({
  name: z.string().describe("食材の名前（例: にんじん、牛乳、豚肉など）"),
  category: z.string().describe("食材のカテゴリー（'冷蔵', '冷凍', '野菜', '調味料', '加工食品', 'その他' のいずれか）。不明な場合は 'その他'"),
  quantity: z.number().describe("推定される数量（数値）。デフォルトは 1"),
  unit: z.string().describe("数量の単位（例: '個', '本', 'g', 'パック', 'ml' など。不明な場合は '個'）"),
  estimatedExpirationDays: z.number().describe("この食材の一般的な賞味期限・消費期限までの推定日数（例: 肉類なら3、野菜なら7、調味料など長期保存可能なら30など）"),
});

export const ImageAnalysisResultSchema = z.object({
  ingredients: z.array(ExtractedIngredientSchema).describe("画像から抽出された食材のリスト"),
});

export type ExtractedIngredient = z.infer<typeof ExtractedIngredientSchema>;
export type ImageAnalysisResult = z.infer<typeof ImageAnalysisResultSchema>;

/**
 * 画像（複数も可、今回は1枚を想定）から食材情報を抽出する
 */
export async function analyzeFoodImageAgent(base64Image: string): Promise<ImageAnalysisResult> {
  const startTime = Date.now();
  console.log(`[ImageAnalyzer] analyzeFoodImageAgent: START`);

  // Ensure base64 prefix
  const base64Data = base64Image.startsWith('data:image/')
    ? base64Image
    : `data:image/jpeg;base64,${base64Image}`;

  const systemPrompt = `
あなたは有能な食材キュレーターです。ユーザーから提供された画像の中に含まれる食材をすべて抽出し、
・食材の名前
・適切なカテゴリー（冷蔵、冷凍、野菜、調味料、加工食品、その他）
・推定数量（数値）と単位（個、パック等）
・購入日から消費・賞味期限までの大まかな推定日数
を出力してください。
画像内に食材が見当たらない場合は空の配列を返してください。
`;

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: ImageAnalysisResultSchema,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'この画像に含まれている食材をリストアップしてください。' },
            { type: 'image', image: base64Data }
          ]
        }
      ],
      temperature: 0.1, // Extract tasks benefit from low temperature
      maxOutputTokens: 2000,
    });

    console.log(`[ImageAnalyzer] analyzeFoodImageAgent: COMPLETED in ${Date.now() - startTime}ms. Detected ${object.ingredients.length} items`);
    return object;
  } catch (error) {
    console.error(`[ImageAnalyzer] Error analyzing image:`, error);
    throw error;
  }
}
