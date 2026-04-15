// lib/receipt/ocr.ts
// OpenAI Vision based OCR service.
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export interface OcrResult {
  rawLines: string[];
  rawText: string;
  success: boolean;
  error?: string;
  confidence?: number;
}

/**
 * Extract text from receipt image using OpenAI Vision.
 */
export async function extractTextFromImage(
  base64Image: string,
  _mimeType: string = "image/jpeg"
): Promise<OcrResult> {
  try {
    console.log('[OCR-OpenAI] Starting Vision processing...');
    
    const { text } = await generateText({
      model: openai('gpt-4o'),
      messages: [
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: 'このレシート画像をOCRして、記載されているテキストを正確に抽出してください。店舗名、日付、商品名、数量、価格、合計金額など、読み取れるすべての情報を改行区切りで出力してください。追加の解説や装飾コード（```等）は一切含めないでください。' 
            },
            { 
              type: 'image', 
              image: Buffer.from(base64Image, 'base64') 
            },
          ],
        },
      ],
    });

    const rawText = text.trim();
    const rawLines = rawText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    console.log(`[OCR-OpenAI] Extraction completed. Lines: ${rawLines.length}`);

    return {
      rawLines,
      rawText,
      success: true,
      confidence: 100
    };
  } catch (error: any) {
    console.error('[OCR-OpenAI] Error:', error);
    return {
      rawLines: [],
      rawText: "",
      success: false,
      error: error.message || "OpenAI Vision OCR process failed"
    };
  }
}
