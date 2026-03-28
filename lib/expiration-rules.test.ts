// lib/expiration-rules.test.ts
import { describe, it, expect } from 'vitest';
import { fuzzySearchFood } from './expiration-rules';

describe('食材データベース検索テスト', () => {
  describe('基本検索', () => {
    it('牛乳で検索できること', () => {
      const result = fuzzySearchFood('牛乳');
      expect(result).toBeTruthy();
      expect(result?.name).toBe('牛乳');
      expect(result?.defaultAmount).toBe(1000);
      expect(result?.defaultUnit).toBe('ml');
    });

    it('鶏肉で検索できること', () => {
      const result = fuzzySearchFood('鶏肉');
      expect(result).toBeTruthy();
      expect(result?.name).toBe('鶏もも肉'); // 一致率の高い項目
      expect(result?.defaultAmount).toBe(400);
    });
  });

  describe('別名・類似語検索', () => {
    it('卵→たまで検索できること', () => {
      const result = fuzzySearchFood('たまご');
      expect(result).toBeTruthy();
      expect(result?.name).toBe('卵');
      expect(result?.defaultAmount).toBe(10);
    });

    it('鮭→しゃけで検索できること', () => {
      const result = fuzzySearchFood('しゃけ');
      expect(result).toBeTruthy();
      expect(result?.name).toBe('鮭');
      expect(result?.defaultAmount).toBe(200);
    });

    it('鶏肉→チキンで検索できること', () => {
      const result = fuzzySearchFood('チキン');
      expect(result).toBeTruthy();
      expect(result?.name).toBe('鶏もも肉');
    });

    it('ツナ缶→シーチキンで検索できること', () => {
      const result = fuzzySearchFood('シーチキン');
      expect(result).toBeTruthy();
      expect(result?.name).toBe('ツナ缶');
      expect(result?.defaultAmount).toBe(70);
    });
  });

  describe('曖昧検索', () => {
    it('部分一致で検索できること', () => {
      const result = fuzzySearchFood('キャベ');
      expect(result).toBeTruthy();
      expect(result?.name).toBe('キャベツ');
    });

    it('誤字でも検索できること', () => {
      const result = fuzzySearchFood('玉ねぎ'); // 正: 玉ねぎ
      expect(result).toBeTruthy();
      expect(result?.name).toBe('玉ねぎ');
    });
  });

  describe('カテゴリ分類', () => {
    it('肉類は冷蔵カテゴリであること', () => {
      const result = fuzzySearchFood('豚肉');
      expect(result?.category).toBe('冷蔵');
    });

    it('缶詰は加工食品カテゴリであること', () => {
      const result = fuzzySearchFood('ツナ缶');
      expect(result?.category).toBe('加工食品');
    });

    it('野菜は野菜カテゴリであること', () => {
      const result = fuzzySearchFood('人参');
      expect(result?.category).toBe('野菜');
    });
  });

  describe('数量データの正確性', () => {
    it('主要食材の数量が現実的であること', () => {
      const testCases = [
        { name: '卵', expectedAmount: 10, expectedUnit: '個' },
        { name: '牛乳', expectedAmount: 1000, expectedUnit: 'ml' },
        { name: '豆腐', expectedAmount: 350, expectedUnit: 'g' },
        { name: 'ツナ缶', expectedAmount: 70, expectedUnit: 'g' },
        { name: '醤油', expectedAmount: 1000, expectedUnit: 'ml' },
      ];

      testCases.forEach(({ name, expectedAmount, expectedUnit }) => {
        const result = fuzzySearchFood(name);
        expect(result?.defaultAmount).toBe(expectedAmount);
        expect(result?.defaultUnit).toBe(expectedUnit);
      });
    });
  });

  describe('存在しない食材', () => {
    it('存在しない食材はnullを返すこと', () => {
      const result = fuzzySearchFood('存在しない食材123');
      expect(result).toBeNull();
    });

    it('空文字列はnullを返すこと', () => {
      const result = fuzzySearchFood('');
      expect(result).toBeNull();
    });
  });

  describe('カバレッジテスト', () => {
    it('一般的な家庭食材のカバー率が高いこと', () => {
      const commonIngredients = [
        '米', 'パン', '卵', '牛乳', '鶏肉', '豚肉', '魚',
        '玉ねぎ', '人参', 'じゃがいも', 'キャベツ', 'トマト',
        '醤油', '味噌', '砂糖', '塩', '油', '豆腐', '納豆'
      ];

      let found = 0;
      commonIngredients.forEach(ingredient => {
        if (fuzzySearchFood(ingredient)) found++;
      });

      const coverage = (found / commonIngredients.length) * 100;
      expect(coverage).toBeGreaterThan(80); // 80%以上カバー
    });
  });
});
