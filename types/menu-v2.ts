// types/menu-v2.ts
// 2案献立生成の新しい型定義

import type { GeneratedMenu } from "../lib/agents/schemas/menu";

/**
 * 献立プランのスコア（0-100）
 */
export interface PlanScores {
  /** 在庫消費率: 手持ち食材をどれだけ効率的に使うか */
  inventoryUsage: number;
  /** 節約度: コスト効率の良さ */
  costEfficiency: number;
  /** 健康度: 栄養バランスの良さ */
  healthScore: number;
  /** 時短度: 調理時間の短さ（オプション） */
  timeEfficiency?: number;
}

/**
 * 軽量サジェスト（第3の提案）
 * フル献立ではなく、方向性だけを示す簡易提案
 */
export interface LightSuggestion {
  /** サジェストテキスト */
  text: string;
  /** カテゴリラベル */
  label: "時短" | "節約" | "創作" | "健康" | "簡単";
  /** AIの確信度（0-1） */
  confidence: number;
  /** 追加のヒント（オプション） */
  hint?: string;
}

/**
 * 2案の比較情報
 */
export interface PlanComparison {
  /** バランス最適案のスコア */
  mainPlan: PlanScores;
  /** 特化案のスコア */
  alternativePlan: PlanScores;
  /** 各案の強みを説明するテキスト */
  summary?: {
    mainPlanStrength: string;
    alternativePlanStrength: string;
  };
}

/**
 * 2案献立生成結果
 * AIからのレスポンス形式
 */
export interface TwoPlanGenerationResult {
  /** メインプラン: バランス最適案 */
  mainPlan: GeneratedMenu & {
    /** この案の特徴・強み */
    role: "balanced";
    /** 推定スコア */
    scores: PlanScores;
  };
  /** オルタナティブプラン: 特化案 */
  alternativePlan: GeneratedMenu & {
    /** この案の特化方向 */
    role: "timeOptimized" | "costOptimized" | "healthOptimized" | "creative";
    /** 特化方向の説明 */
    specializationReason: string;
    /** 推定スコア */
    scores: PlanScores;
  };
  /** 軽量サジェスト */
  lightSuggestion: LightSuggestion;
  /** 比較情報 */
  comparison: PlanComparison;
}

/**
 * フロントエンド表示用の統合結果型
 */
export interface MenuGenerationResultV2 {
  menuGenerationId: string;
  status: string;
  menus: {
    main: GeneratedMenu;
    alternativeA: GeneratedMenu;
    alternativeB?: GeneratedMenu; // 軽量サジェスト用（非推奨）
  };
  lightSuggestion: LightSuggestion;
  comparison: PlanComparison;
  nutrition: {
    main: NutritionInfo;
    altA: NutritionInfo;
  };
  availability: {
    main: AvailabilityData;
    altA: AvailabilityData;
  };
}

/**
 * 栄養情報
 */
export interface NutritionInfo {
  total: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  perDish?: Array<{
    name: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  }>;
}

/**
 * 在庫 availability データ
 */
export interface AvailabilityData {
  available: IngredientStatus[];
  insufficient: IngredientStatus[];
  missing: IngredientStatus[];
}

/**
 * 食材ステータス
 */
export interface IngredientStatus {
  name: string;
  required: { amount: number; unit: string };
  inStock?: { amount: number | string; unit: string };
  shortage?: { amount: number; unit: string };
  status: "available" | "insufficient" | "missing";
}

/**
 * DB保存用の拡張型（nutritionInfo内に追加データを格納）
 */
export interface ExtendedNutritionInfo {
  main: NutritionInfo;
  altA: NutritionInfo;
  altB?: NutritionInfo;
  /** 2案比較スコア（追加） */
  comparison?: PlanComparison;
  /** 軽量サジェスト（追加） */
  lightSuggestion?: LightSuggestion;
}

/**
 * 献立カード表示用の統合データ
 */
export interface MenuCardData {
  type: "main" | "alternative";
  menu: GeneratedMenu;
  scores: PlanScores;
  role: "balanced" | "timeOptimized" | "costOptimized" | "healthOptimized" | "creative";
  availability: AvailabilityData;
  nutrition: NutritionInfo;
  isBest?: boolean;
}
