// GENERATED_BY_AI: 2026-03-18 cascade
// lib/receipt/ocr-tesseract.ts
// Tesseract.js-based OCR service for receipt text extraction.
// Falls back to OpenAI Vision when Tesseract fails or quality is low.

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

export interface OcrResult {
  rawLines: string[];
  rawText: string;
  success: boolean;
  error?: string;
  confidence?: number; // Tesseract confidence score
  foodItems?: string[]; // AI-filtered food items
}

/**
 * Preprocess image for better OCR performance
 */
async function preprocessImage(base64Image: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64Image, 'base64');
    
    // Process image with Sharp for better OCR
    const processedBuffer = await sharp(buffer)
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .sharpen(1, 1, 2)
      .normalize()
      .threshold(128)
      .png()
      .toBuffer();
    
    return processedBuffer.toString('base64');
  } catch (error) {
    console.warn('[OCR] Image preprocessing failed, using original:', error);
    return base64Image;
  }
}

/**
 * Extract text from receipt image using Tesseract.js (server-side).
 * The image must be base64-encoded.
 */
export async function extractTextFromImageTesseract(
  base64Image: string,
  _mimeType: string = "image/jpeg"
): Promise<OcrResult> {
  try {
    console.log('[OCR] Starting Tesseract.js processing...');

    // Guard: reject obviously invalid base64 to avoid worker-level crashes
    // (Buffer.from(..., 'base64') is permissive and can still produce bytes.)
    const cleaned = (base64Image ?? "").trim();
    const isLikelyBase64 =
      cleaned.length >= 16 &&
      cleaned.length % 4 === 0 &&
      /^[A-Za-z0-9+/=]+$/.test(cleaned);
    if (!isLikelyBase64) {
      return {
        rawLines: [],
        rawText: "",
        success: false,
        error: "Invalid base64 image input",
        confidence: 0,
      };
    }
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Image, 'base64');
    
    // Configure Tesseract for Japanese receipt OCR
    const result = await Tesseract.recognize(
      imageBuffer,
      'jpn',
      {
        // Logging for debugging
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log('[OCR] Processing...');
          }
        }
      }
    );
    
    // Process and clean the results
    const rawText = result.data.text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    const rawLines = rawText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // Calculate average confidence
    const confidence = result.data.confidence ?? 0;
    
    console.log(`[OCR] Tesseract.js completed. Confidence: ${confidence}%, Lines: ${rawLines.length}`);
    
    return {
      rawLines,
      rawText,
      success: true,
      confidence
    };
  } catch (error: unknown) {
    console.error('[OCR] Tesseract.js error:', error);
    return {
      rawLines: [],
      rawText: "",
      success: false,
      error: error instanceof Error ? error.message : (error as any)?.message ?? (error as any)?.toString() ?? "Tesseract.js処理中にエラーが発生しました"
    };
  }
}

/**
 * Clean and filter product lines from OCR results using AI.
 * This removes store info, totals, and non-food items.
 */
export async function filterProductLinesWithAI(
  rawLines: string[]
): Promise<{ productLines: string[], nonFoodItems: string[] }> {
  if (!rawLines || rawLines.length === 0) {
    return { productLines: [], nonFoodItems: [] };
  }
  try {
    // 🚀 コスト削減 & 精度向上: AIに送る前に正規表現でノイズ（税、合計、日付、店舗情報等）を除去
    const { productLines: likelyProducts } = filterReceiptLines(rawLines);
    
    if (likelyProducts.length === 0) {
      return { productLines: [], nonFoodItems: rawLines };
    }

    const prompt = `以下のレシートから抽出されたテキスト行から、商品名（食品・飲料・調味料）のみを整理して抽出してください。
不要な記号や価格の断片があれば取り除いてください。

【商品名の抽出対象】:
- 食品: 肉、魚、野菜、果物、乳製品、卵、惣菜、パン、麺
- 飲料: 牛乳、ジュース、お茶、コーヒー、アルコール
- 調味料・その他: 調味料、スパイス、缶詰、冷凍食品

対象テキスト:
${likelyProducts.join('\n')}`;

    const { object: filtered } = await generateObject({
      model: openai('gpt-5.4-nano'),
      schema: z.object({
        productLines: z.array(z.string()).describe('正しい商品名リスト'),
        nonFoodItems: z.array(z.string()).describe('除外したものリスト'),
      }),
      prompt,
      temperature: 0.1,
    });
    
    console.log(`[AI Filter] Products: ${filtered.productLines.length}, Non-food: ${filtered.nonFoodItems.length}`);
    
    return filtered;
  } catch (error: unknown) {
    console.error('[AI Filter] Error:', error);
    // Fallback: return all lines as products
    return {
      productLines: rawLines,
      nonFoodItems: []
    };
  }
}

/**
 * Main OCR function with fallback strategy.
 * 1. Try Tesseract.js first (free, local)
 * 2. If failed or low confidence, use OpenAI Vision
 * 3. Filter product lines using AI
 */
/**
 * Pre-filter receipt lines: separate product lines from metadata (totals, tax, store info).
 */
export function filterReceiptLines(rawLines: string[]): {
  productLines: string[];
  metadataLines: string[];
} {
  const metadataPatterns = [
    /^(合計|小計|税|消費税|内税|外税|お預り|お釣り|釣銭|おつり|支払|クレジット|カード|現金|ポイント|レシート|領収|電話|TEL|tel|\d{2,4}[年\/\-]\d{1,2}[月\/\-]\d{1,2}|店|〒|\d{3}-\d{4})/,
    /^(WAON|waon|入金|残高|今回ポイント|有効|ID\s*\*|電子マネー|割引|値引|クーポン)/i,
    /^(取引|番号|登録|承認|伝票|担当|レジ|客数)/,
    /^.*?No\s*\d+/, // Catch lines with "No" anywhere if accompanied by numbers
    /^(\(内\)|\[内\]|内）|内\s)/,
    /^\s*¥\d+\s*(?:から|に致します)/, // Catch discount explanations like "¥248から ¥178に致します"
    /^[\d\s\-:\.\/・]+$/, // date/time/noise only lines
    /^(※|＊|\*|#|ー|─|━|=|\.|…|・|:|：|；|;)+$/, // separator/punctuation-only lines
    /^(お買い?上げ|ありがとう|またのご来店|いらっしゃいませ)/,
    /^(No\.|レジ|担当|会員|客数)/i,
  ];

  const productLines: string[] = [];
  const metadataLines: string[] = [];

  for (const line of rawLines) {
    const isMetadata = metadataPatterns.some((p) => p.test(line));
    if (isMetadata) {
      metadataLines.push(line);
    } else {
      productLines.push(line);
    }
  }

  return { productLines, metadataLines };
}

/**
 * Main OCR function with parallel processing strategy.
 * 1. Run Tesseract.js and OpenAI Vision in parallel
 * 2. Use the first successful result
 * 3. Filter product lines using AI
 */
export async function extractTextFromImageWithFallback(
  base64Image: string,
  _mimeType: string = "image/jpeg"
): Promise<OcrResult> {
  try {
    console.log('[OCR] Starting parallel processing...');
    
    // Preprocess image for better OCR
    const processedImage = await preprocessImage(base64Image);
    
    // Import OpenAI function for parallel execution
    const { extractTextFromImage: extractTextFromOpenAI } = await import('./ocr');
    
    // Create promises for both OCR methods
    const tesseractPromise = extractTextFromImageTesseract(processedImage, _mimeType);
    const openaiPromise = extractTextFromOpenAI(base64Image, _mimeType); // Use original for OpenAI
    
    // Add timeout to Tesseract (10 seconds)
    const tesseractWithTimeout = Promise.race([
      tesseractPromise,
      new Promise<OcrResult>((_, reject) => 
        setTimeout(() => reject(new Error('Tesseract timeout')), 10_000)
      )
    ]) as Promise<OcrResult>;
    
    // Wait for the first successful result
    try {
      // Try OpenAI first (usually faster and more reliable)
      const openaiResult = await Promise.race([
        openaiPromise,
        new Promise<OcrResult>((_, reject) => 
          setTimeout(() => reject(new Error('OpenAI timeout')), 15_000)
        )
      ]);
      
      console.log('[OCR] OpenAI Vision completed first');
      
      if (openaiResult.success && openaiResult.rawLines.length > 0) {
        // Filter with AI
        const { productLines } = await filterProductLinesWithAI(openaiResult.rawLines);
        return {
          ...openaiResult,
          foodItems: productLines
        };
      }
    } catch (openaiError) {
      console.log('[OCR] OpenAI failed, trying Tesseract...');
    }
    
    // Fallback to Tesseract if OpenAI fails
    try {
      const tesseractResult = await tesseractWithTimeout;
      console.log('[OCR] Tesseract completed');
      
      if (tesseractResult.success && tesseractResult.rawLines.length > 0) {
        // Filter with AI
        const { productLines } = await filterProductLinesWithAI(tesseractResult.rawLines);
        return {
          ...tesseractResult,
          foodItems: productLines
        };
      }
    } catch (tesseractError) {
      console.log('[OCR] Tesseract also failed');
    }
    
    // Both failed - return empty result
    console.log('[OCR] Both methods failed');
    return {
      rawLines: [],
      rawText: "",
      success: false,
      error: "すべてのOCR方法が失敗しました"
    };
    
  } catch (error: unknown) {
    console.error('[OCR] Complete failure:', error);
    return {
      rawLines: [],
      rawText: "",
      success: false,
      error: error instanceof Error ? error.message : (error as any)?.message ?? (error as any)?.toString() ?? "OCR処理に完全に失敗しました"
    };
  }
}
