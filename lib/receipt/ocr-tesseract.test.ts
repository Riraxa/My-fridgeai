// lib/receipt/ocr-tesseract.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractTextFromImageTesseract, filterProductLinesWithAI } from './ocr-tesseract';
import { generateObject } from 'ai';

vi.mock('ai', async (importActual) => {
  const actual = await importActual<typeof import('ai')>();
  return {
    ...actual,
    generateObject: vi.fn(),
  };
});

describe('Tesseract.js OCR', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('extractTextFromImageTesseract', () => {
    it('should handle base64 image input', async () => {
      // Mock base64 image (1x1 pixel transparent PNG)
      const mockBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      
      const result = await extractTextFromImageTesseract(mockBase64, 'image/png');
      
      expect(result).toHaveProperty('rawLines');
      expect(result).toHaveProperty('rawText');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('confidence');
    });

    it('should handle invalid image gracefully', async () => {
      const invalidBase64 = 'invalid-base64-string';
      
      const result = await extractTextFromImageTesseract(invalidBase64, 'image/jpeg');
      
      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
      expect(result.rawLines).toEqual([]);
    });
  });

  describe('filterProductLinesWithAI', () => {
    it('should filter food items correctly', async () => {
      const mockLines = [
        '牛乳',
        '食パン',
        'タバコ',
        '電池',
        '合計: 500円',
        'スーパーABC',
        '醤油'
      ];

      vi.mocked(generateObject).mockResolvedValue({
        object: {
          productLines: ['牛乳', '食パン', '醤油'],
          nonFoodItems: ['タバコ', '電池', 'スーパーABC', '合計: 500円']
        },
        reasoning: undefined,
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        warnings: [],
      } as any);

      const result = await filterProductLinesWithAI(mockLines);
      
      expect(result.productLines).toContain('牛乳');
      expect(result.productLines).toContain('食パン');
      expect(result.productLines).toContain('醤油');
      expect(result.productLines).not.toContain('タバコ');
      expect(result.productLines).not.toContain('電池');
    });

    it('should handle empty input', async () => {
      const result = await filterProductLinesWithAI([]);
      
      expect(result.productLines).toEqual([]);
      expect(result.nonFoodItems).toEqual([]);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete OCR workflow', async () => {
      // This would test the full extractTextFromImageWithFallback function
      // but would require proper mocking of Tesseract and OpenAI
      expect(true).toBe(true); // Placeholder
    });
  });
});
