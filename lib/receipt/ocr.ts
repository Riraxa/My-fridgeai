// GENERATED_BY_AI: 2026-03-11 Antigravity
// lib/receipt/ocr.ts
// OCR service: uses OpenAI GPT-4o-mini vision to extract text from receipt images.
// Falls back gracefully if image is unreadable.
// NOW: Legacy function - use ocr-tesseract.ts for new implementation

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export interface OcrResult {
  rawLines: string[];
  rawText: string;
  success: boolean;
  error?: string;
}

/**
 * Extract text lines from a receipt image using OpenAI Vision (gpt-4o-mini).
 * The image must be base64-encoded.
 * @deprecated Use extractTextFromImageWithFallback from ocr-tesseract.ts instead
 */
export async function extractTextFromImage(
  base64Image: string,
  mimeType: string = "image/jpeg",
): Promise<OcrResult> {
  try {
    const prompt = `あなたはレシートのOCR専門アシスタントです。
以下のレシート画像からすべてのテキスト行を正確に読み取ってください。

ルール:
- 各行を改行で区切って出力してください
- 金額（¥, 円, 税, 合計, 小計, 消費税）の行も含めてください
- 店舗名、日時も含めてください
- 読み取れない文字は「???」と表記してください
- JSON形式ではなく、プレーンテキストで出力してください`;

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image',
              image: `data:${mimeType};base64,${base64Image}`,
            },
          ],
        },
      ],
      temperature: 0,
    });

    const text = result.text;

    if (!text || text.trim().length === 0) {
      return { rawLines: [], rawText: "", success: false, error: "テキストを抽出できませんでした" };
    }

    const rawLines = text
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    return { rawLines, rawText: text, success: true };
  } catch (e: unknown) {
    console.error("OCR extraction error:", e);
    return {
      rawLines: [],
      rawText: "",
      success: false,
      error: e instanceof Error ? e.message : (e as any)?.message ?? "OCR処理中にエラーが発生しました",
    };
  }
}

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
