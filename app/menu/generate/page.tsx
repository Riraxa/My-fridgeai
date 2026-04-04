// GENERATED_BY_AI: 2026-03-18 antigravity
//app/menu/generate/page.tsx
"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import MenuResultCard from "@/app/components/menu/MenuResultCard";
import MenuComparisonBar from "@/app/components/menu/MenuComparisonBar";
import MenuLightSuggestion from "@/app/components/menu/MenuLightSuggestion";
import ErrorBoundary from "@/app/components/error-boundary";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Clock,
  ChefHat,
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  History,
  Calendar,
  Users,
  Coins,
  Lock,
  Unlock,
  Info,
  ShoppingCart,
  X,
} from "lucide-react";
import PageTransition, {
  HeaderTransition,
  ContentTransition,
} from "@/app/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { useFridge } from "@/app/components/FridgeProvider";
import { toast } from "sonner";
import { Toggle } from "@/app/components/ui/Toggle";

// ==================== レベル2: コンテキスト連動型メッセージシステム ====================

// 検出可能な在庫パターン型
type InventoryPattern = 
  | 'lowInventory'      // 食材が少ない
  | 'hasExpiring'       // 期限間近食材あり
  | 'vegetableHeavy'    // 野菜が多い
  | 'proteinHeavy'      // 肉・魚が多い
  | 'hasBudget'         // 予算設定あり
  | 'strictMode'        // 厳格モード
  | 'largeServings'     // 大人数
  | 'constraintHeavy'; // 制約が厳しい（lowInventory + largeServingsなどの組み合わせ）

// パターン別優先メッセージ（必ず最初に表示される）- 各パターン3つの言い換えを用意
const PRIORITY_MESSAGES: Record<InventoryPattern, string[]> = {
  constraintHeavy: [
    "限られた食材で大人数分の最適解を探索中...",
    "少ない在庫から大家族を満足させる構成を模索中...",
    "厳しい制約条件下で創造的な解を探求中...",
  ],
  lowInventory: [
    "限られた食材で最適な組み合わせを模索中...",
    "少ない在庫から最大の価値を引き出す工夫を検討中...",
    "手持ち食材を余すことなく活用するプランを構築中...",
  ],
  hasExpiring: [
    "期限間近の食材を優先的に活用するプランを検討中...",
    "食品ロスを減らす効率的な使い切り順序を立案中...",
    "鮮度が高い順に食材を活かすタイムラインを設計中...",
  ],
  vegetableHeavy: [
    "野菜を中心とした栄養バランスを調整中...",
    "食物繊維とビタミンの最適配分を計算中...",
    "ヘルシーな野菜メインの献立構成を検討中...",
  ],
  proteinHeavy: [
    "たんぱく質を効率的に活用する献立を設計中...",
    "肉・魚の鮮度を活かす最適な調理法を選定中...",
    "高タンパクなバランスの取れた献立を立案中...",
  ],
  hasBudget: [
    "予算内で最適な食材配分を計算中...",
    "コスパ重視の献立構成を模索中...",
    "予算と満足感のバランスを最適化中...",
  ],
  strictMode: [
    "厳格な制約条件での最適解を探索中...",
    "指定された食材のみで完結するレシピを検討中...",
    "在庫のみを使用した創造的なアレンジを研究中...",
  ],
  largeServings: [
    "大家族でも満足できる量とバランスを計算中...",
    "大人数調理の効率化と味の均一性を確保中...",
    "多人数向けのボリューム感と栄養バランスを調整中...",
  ],
};

// 献立特徴予測メッセージ（結果との整合性強化用）- 表現を弱めて断定を避ける
const MENU_CHARACTERISTIC_MESSAGES: Record<string, string[]> = {
  // 入力条件から予測される献立特徴（途中表示用 - 柔らかい表現）
  japanesePredicted: [
    "和食のバランスも考慮しながら構成を調整中...",
    "日本の伝統的な要素も取り入れながら検討中...",
    "和の食材の組み合わせも視野に入れて設計中...",
  ],
  costPredicted: [
    "予算のバランスも考慮しながら食材を選定中...",
    "コスパも意識しながら工夫を検討中...",
    "節約しつつ栄養バランスも保つ方向で構築中...",
  ],
  timePredicted: [
    "調理時間も考慮しながら効率的な手順を設計中...",
    "時短の観点も取り入れながら立案中...",
    "並行調理の可能性も視野に入れてスケジュール作成中...",
  ],
  simplePredicted: [
    "シンプルな調理法も視野に入れながら構成を検討中...",
    "手間を抑えつつ満足感も出せる方向で模索中...",
    "最小限の工程で美味しさを追求する方向で調整中...",
  ],
};

// 生成完了後の確定メッセージ（結果と整合 - 過剰断定を避けた柔軟な表現）
const MENU_CHARACTERISTIC_CONFIRMED: Record<string, string[]> = {
  japaneseConfirmed: [
    "和食のバランスを意識した構成に仕上げました",
    "日本の伝統的な要素を取り入れた献立に決定しました",
    "和の食材を活かした構成で完成しました",
  ],
  costConfirmed: [
    "コスパを意識した構成に仕上げました",
    "予算のバランスを考慮した献立に決定しました",
    "節約しつつ栄養バランスも保った構成で完成しました",
  ],
  timeConfirmed: [
    "比較的短時間で調理できる構成に仕上げました",
    "効率的な調理手順を意識した献立に決定しました",
    "時短の観点も取り入れた構成で完成しました",
  ],
  simpleConfirmed: [
    "シンプルな調理法で素材の味を活かした構成に仕上げました",
    "手間を抑えつつ満足感のある献立に決定しました",
    "最小限の調理工程で美味しさを追求した構成で完成しました",
  ],
};


// パターンプリオリティ順（高いほど先に表示、競合時は高優先度が勝つ）
const PATTERN_PRIORITY: InventoryPattern[] = [
  'constraintHeavy',  // 最優先：矛盾する制約の組み合わせ
  'hasExpiring',      // 期限間近は緊急
  'strictMode',       // 厳格モードは意識してる
  'largeServings',    // 大人数は難易度が上がる
  'lowInventory',     // 少ない食材
  'hasBudget',        // 予算制約
  'vegetableHeavy',   // 野菜多め
  'proteinHeavy',     // 肉魚多め
];

/**
 * 入力条件から献立特徴を予測する関数
 * 結果との整合性を高めるため、生成前に予測メッセージを表示
 */
function predictMenuCharacteristics(
  patterns: InventoryPattern[],
  options: {
    strictMode: boolean;
    hasBudget: boolean;
    lowInventory: boolean;
    largeServings: boolean;
  }
): string[] {
  const predictedMessages: string[] = [];
  const { strictMode, hasBudget, lowInventory, largeServings } = options;

  // 予測ロジック：入力条件から献立の特徴を予測
  
  // 1. シンプル予測（strictMode + lowInventory）
  if (strictMode || lowInventory) {
    const simpleMessages = MENU_CHARACTERISTIC_MESSAGES.simplePredicted ?? [];
    if (simpleMessages.length > 0) {
      const selected = simpleMessages[Math.floor(Math.random() * simpleMessages.length)];
      if (selected) predictedMessages.push(selected);
    }
  }

  // 2. コスパ予測（hasBudget）
  if (hasBudget) {
    const costMessages = MENU_CHARACTERISTIC_MESSAGES.costPredicted ?? [];
    if (costMessages.length > 0) {
      const selected = costMessages[Math.floor(Math.random() * costMessages.length)];
      if (selected) predictedMessages.push(selected);
    }
  }

  // 3. 時短予測（largeServings - 大人数は時短が重要）
  if (largeServings) {
    const timeMessages = MENU_CHARACTERISTIC_MESSAGES.timePredicted ?? [];
    if (timeMessages.length > 0) {
      const selected = timeMessages[Math.floor(Math.random() * timeMessages.length)];
      if (selected) predictedMessages.push(selected);
    }
  }

  // 4. 和食予測（デフォルトで和食ベースが多い傾向）
  // 特定の条件がない場合は和食を予測（実際の生成結果と整合しやすい）
  if (!hasBudget && !lowInventory && predictedMessages.length === 0) {
    const japaneseMessages = MENU_CHARACTERISTIC_MESSAGES.japanesePredicted ?? [];
    if (japaneseMessages.length > 0) {
      const selected = japaneseMessages[Math.floor(Math.random() * japaneseMessages.length)];
      if (selected) predictedMessages.push(selected);
    }
  }

  return predictedMessages;
}

/**
 * 生成完了後の確定メッセージを生成
 * 予測→確定の流れで一貫性を持たせる
 */
function generateConfirmedMessage(
  patterns: InventoryPattern[],
  options: {
    strictMode: boolean;
    hasBudget: boolean;
    lowInventory: boolean;
    largeServings: boolean;
  }
): string | null {
  const { strictMode, hasBudget, lowInventory, largeServings } = options;
  const confirmedMessages: string[] = [];

  // 1. シンプル確定（strictMode + lowInventory）
  if (strictMode || lowInventory) {
    const simpleMessages = MENU_CHARACTERISTIC_CONFIRMED.simpleConfirmed ?? [];
    if (simpleMessages.length > 0) {
      const selected = simpleMessages[Math.floor(Math.random() * simpleMessages.length)];
      if (selected) confirmedMessages.push(selected);
    }
  }

  // 2. コスパ確定（hasBudget）
  if (hasBudget) {
    const costMessages = MENU_CHARACTERISTIC_CONFIRMED.costConfirmed ?? [];
    if (costMessages.length > 0) {
      const selected = costMessages[Math.floor(Math.random() * costMessages.length)];
      if (selected) confirmedMessages.push(selected);
    }
  }

  // 3. 時短確定（largeServings - 大人数は時短が重要）
  if (largeServings) {
    const timeMessages = MENU_CHARACTERISTIC_CONFIRMED.timeConfirmed ?? [];
    if (timeMessages.length > 0) {
      const selected = timeMessages[Math.floor(Math.random() * timeMessages.length)];
      if (selected) confirmedMessages.push(selected);
    }
  }

  // 4. 和食確定（デフォルト）
  if (!hasBudget && !lowInventory && confirmedMessages.length === 0) {
    const japaneseMessages = MENU_CHARACTERISTIC_CONFIRMED.japaneseConfirmed ?? [];
    if (japaneseMessages.length > 0) {
      const selected = japaneseMessages[Math.floor(Math.random() * japaneseMessages.length)];
      if (selected) confirmedMessages.push(selected);
    }
  }

  // 最初の確定メッセージを返す（または複数を結合）
  if (confirmedMessages.length > 0) {
    return confirmedMessages[0] ?? null;
  }
  return null;
}


// 食材カテゴリ判定用キーワード
const VEGETABLE_KEYWORDS = ['野菜', 'にんじん', '人参', 'たまねぎ', '玉ねぎ', '玉葱', 'ピーマン', 'パプリカ', 'なす', 'ナス', 'きゅうり', '胡瓜', 'トマト', 'とまと', 'レタス', 'キャベツ', '白菜', 'ほうれん草', 'ホウレン草', '小松菜', 'ブロッコリー', 'ブロッコリ', 'カリフラワー', 'かぼちゃ', '南瓜', '大根', 'だいこん', 'ごぼう', '牛蒡', 'れんこん', '蓮根', 'もやし', 'モヤシ', '豆苗', 'しいたけ', '椎茸', 'しめじ', 'エノキ', 'えのき', 'マッシュルーム', 'キノコ', 'きのこ'];
const PROTEIN_KEYWORDS = ['肉', '鶏', '豚', '牛', '魚', '鮭', 'サケ', 'さけ', '鮪', 'マグロ', 'まぐろ', '鰹', 'カツオ', 'かつお', '鯖', 'サバ', 'さば', '鯛', 'タイ', 'たい', '鱈', 'タラ', 'たら', '鰤', 'ブリ', 'ぶり', '鮃', 'ヒラメ', 'ひらめ', '鰈', 'カレイ', 'かれい', '海老', 'エビ', 'えび', '蟹', 'カニ', 'かに', '烏賊', 'イカ', 'いか', '蛸', 'タコ', 'たこ', '豆腐', 'とうふ', '豆富', '卵', 'たまご', '玉子'];

/**
 * 在庫パターンを検出する関数
 */
function detectInventoryPatterns(
  ingredients: Array<{ name: string; expirationDate?: string | null }>,
  options: {
    inventoryCount: number;
    expiringCount: number;
    servings: number;
    budget: number | null;
    strictMode: boolean;
  }
): InventoryPattern[] {
  const patterns: InventoryPattern[] = [];
  const { inventoryCount, expiringCount, servings, budget, strictMode } = options;

  // 1. 基本パターン検出
  if (inventoryCount <= 5) patterns.push('lowInventory');
  if (expiringCount > 0) patterns.push('hasExpiring');
  if (budget !== null) patterns.push('hasBudget');
  if (strictMode) patterns.push('strictMode');
  if (servings >= 5) patterns.push('largeServings');

  // 2. 食材カテゴリ分析
  const vegCount = ingredients.filter(i => 
    VEGETABLE_KEYWORDS.some(k => i.name.includes(k))
  ).length;
  const proteinCount = ingredients.filter(i => 
    PROTEIN_KEYWORDS.some(k => i.name.includes(k))
  ).length;

  if (vegCount >= inventoryCount * 0.5 && inventoryCount > 0) {
    patterns.push('vegetableHeavy');
  }
  if (proteinCount >= inventoryCount * 0.5 && inventoryCount > 0) {
    patterns.push('proteinHeavy');
  }

  // 3. 競合パターンの検出（最優先）
  // lowInventory + largeServings = 制約が厳しい状況
  if (patterns.includes('lowInventory') && patterns.includes('largeServings')) {
    patterns.push('constraintHeavy');
  }

  // 優先順位でソートして返す
  return patterns.sort((a, b) => {
    const indexA = PATTERN_PRIORITY.indexOf(a);
    const indexB = PATTERN_PRIORITY.indexOf(b);
    return indexA - indexB;
  });
}

/**
 * パターンに基づいた優先メッセージリストを生成
 * 重要パターンは必ず先頭に、残りはシャッフル
 */
function generateContextAwareMessages(
  patterns: InventoryPattern[],
  allGeneralMessages: string[]
): string[] {
  // 1. 優先メッセージを収集（優先順位順）
  const priorityMessages: string[] = [];
  for (const pattern of patterns) {
    const messages = PRIORITY_MESSAGES[pattern];
    if (messages && messages.length > 0) {
      // 各パターンからランダムに1つ選ぶ
      const selected = messages[Math.floor(Math.random() * messages.length)];
      if (selected) {
        priorityMessages.push(selected);
      }
    }
  }

  // 2. 一般メッセージをシャッフル
  const shuffledGeneral = [...allGeneralMessages].sort(() => Math.random() - 0.5);

  // 3. 結合：優先メッセージ（強制表示）→ 一般メッセージ
  // 優先メッセージは必ず先頭に来る（重複除去）
  const uniquePriorities = [...new Set(priorityMessages)];
  
  return [...uniquePriorities, ...shuffledGeneral];
}

// ================================================================================

// Helper to calculate total cooking time from dishes
const calculateCookingTime = (dishes: { cookingTime?: number }[]) => {
  if (!dishes) return "20分";
  const sum = dishes.reduce(
    (acc: number, d: { cookingTime?: number }) => acc + (d.cookingTime ?? 0),
    0,
  );
  return sum > 0 ? `${sum}分` : "20分";
};

// Helper to calculate max difficulty
const calculateDifficulty = (dishes: { difficulty?: number }[]) => {
  if (!dishes) return "★3";
  const nums = dishes.map((d: { difficulty?: number }) => d.difficulty ?? 3);
  const max = Math.max(...nums);
  return `★${max}`;
};

interface RecipeDetail {
  title: string;
  description?: string;
  servings: number;
  time_minutes: number;
  difficulty: string;
  ingredients: {
    name: string;
    quantity_per_serving: number;
    unit: string;
    total_quantity: number;
    optional: boolean;
    notes?: string;
  }[];
  steps: string[];
  tips: string[];
  pitfalls?: string[];
  storage?: string;
  timers?: { step: number; seconds: number; label: string }[];
  grocery_additions?: string[];
}

// 思考プロセスを抽出する関数（セーフティフィルタ付き）
function extractThoughts(text: string): string[] {
  const thoughts: string[] = [];
  const lines = text.split('\n');
  
  // 禁止ワードリスト（信頼低下を招く可能性のある表現）
  const forbiddenPatterns = [
    /\b(馬鹿|バカ|アホ|死ね|消えろ|クソ|ファック|fuck|shit)\b/i,
    /\b(無理|不可能|失敗|ダメ|駄目|出来ない)\s*(絶対|絶対に|完全に)\b/i,
    /\b(誰でも|簡単に|楽勝|余裕|カス)\b/i,
    /\b(適当|なんでもいい|適当に)\b/i,
  ];
  
  // AIの思考らしい表現パターン
  const thinkingPatterns = [
    /(?:考え|検討|計算|分析|確認|調整|模索|設計|立案|算出|構築|探索|発見|考案|提案|アレンジ|研究|活用|活用|最適化)/,
    /(?:について|を|について|の|しながら|つつ|から|をもとに)/,
  ];
  
  // フォールバックメッセージ（AI思考が取得できない場合）
  const fallbackMessages = [
    "冷蔵庫の在庫を確認中...",
    "期限間近の食材を優先的に活用するプランを検討中...",
    "栄養バランスを計算中...",
    "調理手順の難易度を見積もり中...",
    "食材の組み合わせの相性をチェック中...",
    "主菜・副菜・汁物のバランスを調整中...",
    "調理時間を短縮する工夫を考案中...",
    "在庫を無駄にしないアイデアを研究中...",
    "家族みんなが喜ぶメニューをアレンジ中...",
    "季節に合った食材の活用法を提案中...",
    "ヘルシーで満足感のある組み合わせを設計中...",
  ];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // 1. 箇条書きパターンを検出（従来通り）
    if (trimmed.startsWith('-') || trimmed.startsWith('・')) {
      const thought = trimmed.replace(/^[-・]\s*/, '').trim();
      if (thought && 
          thought.length > 5 && 
          !thought.includes('```') && 
          !thought.includes('mainPlan') &&
          !thought.includes('alternativePlan') &&
          !forbiddenPatterns.some(p => p.test(thought))) {
        thoughts.push(thought);
      }
      continue;
    }
    
    // 2. 自然な文章パターンを検出（新規）
    // 「〜中...」「〜を考える」「〜を検討」などの思考表現
    if (trimmed.length > 10 && trimmed.length < 100) {
      // 不適切なパターンを除外
      if (forbiddenPatterns.some(p => p.test(trimmed))) continue;
      
      // JSONマーカーやコードっぽいものを除外
      if (trimmed.includes('```') || 
          trimmed.includes('mainPlan') ||
          trimmed.includes('alternativePlan') ||
          trimmed.includes('{') || 
          trimmed.includes('}') ||
          trimmed.startsWith('//')) continue;
      
      // 思考らしい表現を含むかチェック
      const hasThinkingPattern = thinkingPatterns.some(p => p.test(trimmed));
      
      // 「です」「ます」や丁寧語、または思考動詞を含む文章
      const isNaturalThought = (trimmed.includes('です') || 
                                 trimmed.includes('ます') ||
                                 trimmed.includes('中...') ||
                                 trimmed.includes('考え') ||
                                 trimmed.includes('検討') ||
                                 trimmed.includes('分析') ||
                                 trimmed.includes('確認') ||
                                 trimmed.includes('調整'));
      
      if (hasThinkingPattern || isNaturalThought) {
        thoughts.push(trimmed);
      }
    }
  }
  
  // AIの思考が取得できなかった場合、フォールバックメッセージを返す
  if (thoughts.length === 0) {
    // タイムスタンプに基づいて異なるメッセージを選択
    const timeIndex = Math.floor(Date.now() / 3000) % fallbackMessages.length;
    return fallbackMessages.slice(timeIndex, timeIndex + 3);
  }
  
  return thoughts.slice(0, 6); // 最大6個まで
}

function MenuGeneratePage() {
  // 既存のコンポーネントロジック
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const { setShopping, isNavBarVisible, setIsNavBarVisible } = useFridge();
  const source = searchParams?.get("source") === "onboarding" ? "onboarding" : "default";

  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [thoughtStream, setThoughtStream] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentThoughtIndex, setCurrentThoughtIndex] = useState(0);
  const [detectedPatterns, setDetectedPatterns] = useState<InventoryPattern[]>([]);
  const [priorityMessageCount, setPriorityMessageCount] = useState(0);
  const shuffledMessagesRef = useRef<string[]>([]);
  
  // ポーリング制御用のref
  const pollControllerRef = useRef<{ isActive: boolean; worker?: Worker }>({ isActive: false });
  
  // Use session plan if available, otherwise fallback to null (loading)
  const sessionIsPro = !!(session?.user && (session.user as any).plan === "PRO");
  const [isPro, setIsPro] = useState<boolean | null>(
    sessionStatus === "loading" || sessionStatus === "unauthenticated" ? (sessionStatus === "unauthenticated" ? false : null) : sessionIsPro
  );
  const [isProLoading, setIsProLoading] = useState(sessionStatus === "loading");
  const [usage, setUsage] = useState<{
    today: number;
    limit: number;
    remaining: number;
  } | null>(null);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(
    null,
  );

  // ステップ管理 (献立生成)
  const progressSteps = {
    preparing: "準備中...",
    generating: "AI献立生成中...",
    calculating: "栄養計算中...",
    validating: "最終確認中...",
    completed: "完了"
  };
  const [currentProgressStep, setCurrentProgressStep] = useState<string>("preparing");

  // 献立生成中の進捗ステップ更新
  useEffect(() => {
    if (!loading) {
      setCurrentProgressStep("preparing");
    }
  }, [loading]);

  const [inventoryCount, setInventoryCount] = useState<number | null>(null);
  const [expiringCount, setExpiringCount] = useState<number | null>(null);
  const [ingredients, setIngredients] = useState<Array<{ name: string; expirationDate?: string | null }>>([]);

  // ステップ管理 (レシピ取得)
  const [retrievingDishName, setRetrievingDishName] = useState<string | null>(null);
  const [recipeProgressStep, setRecipeProgressStep] = useState<string>("fetching-dish-1");
  const [totalDishes, setTotalDishes] = useState<number>(0);

  // Conditions
  const [servings, setServings] = useState(2); // Default 2
  const [enableBudget, setEnableBudget] = useState(false);
  const [budget, setBudget] = useState<number | "">("")

  // Constraint Mode
  const [strictMode, setStrictMode] = useState(false);
  const [insufficientError, setInsufficientError] = useState(false);
  const [showImplicitList, setShowImplicitList] = useState(false);

  // Recipe Detail Modal State
  const [selectedMenuType, setSelectedMenuType] = useState<string | null>(null);
  const [selectedMenuData, setSelectedMenuData] = useState<any>(null);
  const [recipeDetails, setRecipeDetails] = useState<RecipeDetail[]>([]);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [errorRecipe, setErrorRecipe] = useState<string | null>(null);
  const [currentDishIndex, setCurrentDishIndex] = useState(0);

  // 買い物リストに材料を追加する関数
  const handleAddToShoppingList = async (ingredients: string[]) => {
    try {
      // 既存の買い物リストに追加
      setShopping((prev) => {
        const existing = prev ?? [];
        // 重複を避けるために既存のアイテムをチェック
        const filtered = ingredients.filter(
          (ingredient) =>
            !existing.some((item: { name: string }) => item.name === ingredient),
        );

        const newItems = filtered.map((ingredient, index) => ({
          id: `shopping-${Date.now()}-${index}`,
          name: ingredient,
          done: false,
          quantity: "",
          unit: "",
          note: "",
        }));

        return [...existing, ...newItems];
      });

      toast.success(
        `${ingredients.length}件の食材を買い物リストに追加しました`,
      );
    } catch (error) {
      // Silent fail for shopping list
      toast.error("買い物リストへの追加に失敗しました");
    }
  };

  // 状態の保存・復元
  useEffect(() => {
    // ページ読み込み時に状態を復元 from localStorage (Processing State)
    const savedState = localStorage.getItem("menuGenerationState");
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        // 30分以内の状態のみ復元
        if (
          Date.now() - state.timestamp < 30 * 60 * 1000 &&
          state.loading &&
          state.currentGenerationId
        ) {
          setLoading(true);
          setCurrentGenerationId(state.currentGenerationId);
          // 少し遅延してポーリングを再開
          setTimeout(() => {
            pollForCompletion(state.currentGenerationId);
          }, 1000);
        } else {
          localStorage.removeItem("menuGenerationState");
        }
      } catch (e) {
        // Silent fail for state restore
        localStorage.removeItem("menuGenerationState");
      }
    }

    // Restore generated result from sessionStorage (Result State)
    const savedResult = sessionStorage.getItem("menuGeneratedResult");
    if (savedResult) {
      try {
        const parsed = JSON.parse(savedResult);
        setGenerated(parsed);
      } catch (e) {
        // Silent fail for menu restore
        sessionStorage.removeItem("menuGeneratedResult");
      }
    }
  }, []);

  // 状態が変更されたら保存
  useEffect(() => {
    if (loading || currentGenerationId) {
      localStorage.setItem(
        "menuGenerationState",
        JSON.stringify({
          loading,
          currentGenerationId,
          timestamp: Date.now(),
        }),
      );
    } else {
      localStorage.removeItem("menuGenerationState");
    }
  }, [loading, currentGenerationId]);

  const pollForCompletion = useCallback((generationId: string) => {
    // 既存のWorkerがあれば確実に終了
    if (pollControllerRef.current.worker) {
      pollControllerRef.current.worker.terminate();
      pollControllerRef.current.worker = undefined;
    }
    
    pollControllerRef.current.isActive = true;
    
    // Web Workerを作成してバックグラウンドポーリング
    const worker = new Worker('/polling-worker.js');
    
    // タイムアウト処理（5分）
    const timeoutId = setTimeout(() => {
      worker.terminate();
      pollControllerRef.current.worker = undefined;
      pollControllerRef.current.isActive = false;
      setError("献立生成がタイムアウトしました。再試行してください。");
      setLoading(false);
      setCurrentGenerationId(null);
      localStorage.removeItem("menuGenerationState");
    }, 5 * 60 * 1000);
    
    worker.onmessage = (e) => {
      const { type, status, data, error } = e.data;
      
      if (type === 'status') {
        if (data?.progressStep) {
          setCurrentProgressStep(data.progressStep as string);
        }
        
        if (status === 'completed') {
          clearTimeout(timeoutId);
          
          // APIレスポンスのネスト構造を正しく処理
          // data = { success, status, progressStep, data: { menuGenerationId, menus, ... } }
          const responseData = data?.data;
          
          if (!responseData) {
            setError("献立データが見つかりませんでした");
            setLoading(false);
            setCurrentGenerationId(null);
            localStorage.removeItem("menuGenerationState");
            worker.terminate();
            pollControllerRef.current.worker = undefined;
            pollControllerRef.current.isActive = false;
            return;
          }
          
          const confirmedMessage = generateConfirmedMessage(detectedPatterns, {
            strictMode,
            hasBudget: !!(enableBudget && budget),
            lowInventory: (inventoryCount ?? 0) <= 5,
            largeServings: servings >= 5,
          });
          
          if (confirmedMessage) {
            setThoughtStream((prev) => [...prev, confirmedMessage]);
          }
          
          setGenerated(responseData);
          setIsStreaming(false); // 確実にストリーミング状態をリセット
          sessionStorage.setItem("menuGeneratedResult", JSON.stringify(responseData));
          setUsage((prev) => prev ? { ...prev, today: prev.today + 1, remaining: Math.max(0, prev.remaining - 1) } : null);
          setLoading(false);
          setCurrentGenerationId(null);
          localStorage.removeItem("menuGenerationState");
          pollControllerRef.current.isActive = false;
          worker.terminate();
          pollControllerRef.current.worker = undefined;
          
        } else if (status === 'failed') {
          clearTimeout(timeoutId);
          
          if (strictMode) {
            setInsufficientError(true);
          } else {
            setError("献立生成に失敗しました。再試行してください。");
          }
          
          setLoading(false);
          setIsStreaming(false); // 確実にストリーミング状態をリセット
          setCurrentGenerationId(null);
          localStorage.removeItem("menuGenerationState");
          pollControllerRef.current.isActive = false;
          worker.terminate();
          pollControllerRef.current.worker = undefined;
        }
      } else if (type === 'error') {
        clearTimeout(timeoutId);
        // エラーが続く場合のみ表示（一時的エラーは無視）
        // Workerは継続してポーリングを試行
      }
    };
    
    worker.onerror = (err) => {
      clearTimeout(timeoutId);
      setError("通信エラーが発生しました。ページを更新して再試行してください。");
      setLoading(false);
      setCurrentGenerationId(null);
      pollControllerRef.current.isActive = false;
      worker.terminate();
      pollControllerRef.current.worker = undefined;
    };
    
    worker.postMessage({
      type: 'start',
      generationId,
      url: '/api/menu/status',
      interval: 500
    });
    
    pollControllerRef.current.worker = worker;
  }, [detectedPatterns, strictMode, enableBudget, budget, inventoryCount, servings]);

  // ページ可視性の監視
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && loading && currentGenerationId && !pollControllerRef.current.isActive) {
        pollForCompletion(currentGenerationId);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loading, currentGenerationId, pollForCompletion]);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      if (pollControllerRef.current.worker) {
        pollControllerRef.current.worker.terminate();
        pollControllerRef.current.worker = undefined;
      }
      pollControllerRef.current.isActive = false;
    };
  }, []);

  // ブラウザの戻る操作をブロック
  useEffect(() => {
    if (isNavBarVisible) return;

    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      toast("調理を中断する場合は、戻るボタン等でキャンセルしてください。", {
        id: "nav-block-toast",
      });
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isNavBarVisible]);

  // アプリ内操作制限 - レシピモーダル表示中はアプリ内の操作のみ無効化
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): boolean => {
      // ESCキーでモーダルが閉じるのを防止（レシピ取得中も含む）
      if (e.key === "Escape") {
        const currentSelectedMenuType = selectedMenuType;
        const currentLoadingRecipe = loadingRecipe;
        if (currentSelectedMenuType || currentLoadingRecipe) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }

      // F5（リロード）とCtrl+Rのみ防止（ブラウザ操作は許可）
      if ((selectedMenuType || loadingRecipe) && (
        e.key === "F5" ||
        (e.ctrlKey && e.key === "r")
      )) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }

      return true;
    };

    // イベントリスナー登録（キャプチャフェーズで優先的に処理）
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [selectedMenuType, loadingRecipe]);

  // Sync isPro with session when it changes
  useEffect(() => {
    if (sessionStatus !== "loading") {
      const pro = (session?.user as any)?.plan === "PRO";
      setIsPro(pro);
      setIsProLoading(false);
    }
  }, [session, sessionStatus]);

  // Fetch usage and inventory summary
  useEffect(() => {
    async function fetchData() {
      try {
        const userRes = await fetch("/api/user/me");
        if (userRes.ok) {
          const userData = await userRes.json();
          // Keep isPro from session as source of truth, but can update if mismatch
          if (userData.user?.plan === "PRO" && !isPro && sessionStatus !== "loading") {
            setIsPro(true);
          }
          setUsage(userData.usage);
        }
      } catch (e) {
        // Silent fail for user data fetch
      } finally {
        // Only set loading false if session also finished
        if (sessionStatus !== "loading") {
          setIsProLoading(false);
        }
      }

      try {
        const res = await fetch("/api/ingredients");
        if (res.ok) {
          const data = await res.json();
          const ingredients = data.items ?? [];
          setInventoryCount(ingredients.length);
          setIngredients(ingredients);

          const now = new Date();
          const count = ingredients.filter((i: { expirationDate?: string }) => {
            if (!i.expirationDate) return false;
            const exp = new Date(i.expirationDate);
            const diffTime = exp.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 3 && diffDays >= 0;
          }).length;
          setExpiringCount(count);
        }
      } catch (e) {
        // Silent fail for ingredients fetch
      }
    }
    fetchData();
  }, []);

  // Ensure navigation bar is visible when page loads
  useEffect(() => {
    setIsNavBarVisible(true);
  }, [setIsNavBarVisible]);

  // Rotate fallback messages during loading when no AI thoughts available
  useEffect(() => {
    if (!loading || thoughtStream.length > 0) return;
    
    // カテゴリ別の思考メッセージ（より多様で面白い内容）
    const thinkingCategories = {
      analysis: [
        "冷蔵庫の在庫データを解析中...",
        "食材の鮮度パターンを分析中...",
        "調理履歴から好みを学習中...",
        "残り食材の最適活用率を計算中...",
        "食材の相性マトリックスを構築中...",
      ],
      planning: [
        "今日の献立コンセプトを立案中...",
        "主菜・副菜・汁物の黄金比を模索中...",
        "ワンプレートの彩りバランスを設計中...",
        "献立のストーリー性を構築中...",
        "食卓のシーン別最適解を算出中...",
      ],
      creativity: [
        "意外な食材コンビの可能性を探索中...",
        "新しい調理法のアイデアを閃き中...",
        "レトロ料理のモダンアレンジを考案中...",
        "世界の料理手法を融合中...",
        "在庫食材の隠し味活用法を発見中...",
      ],
      practical: [
        "調理時間の最適スケジュールを立案中...",
        "洗い物を減らす工夫を検討中...",
        "作り置き可能な副菜を選定中...",
        "翌日のお弁当活用プランを検討中...",
        "冷蔵庫の空きスペースを意識した買い足し案を作成中...",
      ],
      wellness: [
        "栄養素の相乗効果を計算中...",
        "季節の体調管理に適した食材を選定中...",
        "消化負担の少ない献立バランスを調整中...",
        "たんぱく質の効率的摂取プランを設計中...",
        "食物繊維の最適配分を計算中...",
      ],
    };
    
    // 全カテゴリからランダムに選んでシャッフル
    const allMessages = Object.values(thinkingCategories).flat();
    
    // 在庫パターンを検出
    const ingredientList = ingredients;
    const patterns = detectInventoryPatterns(ingredientList, {
      inventoryCount: inventoryCount ?? 0,
      expiringCount: expiringCount ?? 0,
      servings,
      budget: enableBudget && budget ? Number(budget) : null,
      strictMode,
    });
    setDetectedPatterns(patterns);
    
    // 献立特徴を予測（結果との整合性強化）
    const predictedMessages = predictMenuCharacteristics(patterns, {
      strictMode,
      hasBudget: !!(enableBudget && budget),
      lowInventory: (inventoryCount ?? 0) <= 5,
      largeServings: servings >= 5,
    });
    
    // コンテキスト連動型メッセージを生成
    const contextAwareMessages = generateContextAwareMessages(patterns, allMessages);
    
    // 優先メッセージ + 予測メッセージ + 一般メッセージの順で結合
    // 予測メッセージは優先メッセージの直後に挿入（結果整合のため）
    const priorityCount = patterns.length;
    const finalMessages = [
      ...contextAwareMessages.slice(0, priorityCount), // 優先メッセージ
      ...predictedMessages, // 予測メッセージ（結果整合）
      ...contextAwareMessages.slice(priorityCount), // 一般メッセージ
    ];
    
    shuffledMessagesRef.current = finalMessages;
    setPriorityMessageCount(priorityCount + predictedMessages.length); // 優先+予測メッセージ数を記録
    
    // 優先メッセージを必ず最初に表示（最初は0番目から開始）
    setCurrentThoughtIndex(0);
    
    const interval = setInterval(() => {
      setCurrentThoughtIndex((prev) => {
        const next = (prev + 1) % contextAwareMessages.length;
        // 優先メッセージ範囲内を循環するか、全体を循環
        return next;
      });
    }, 2500 + Math.random() * 1000); // 2.5〜3.5秒でランダム間隔
    
    return () => clearInterval(interval);
  }, [loading, thoughtStream.length, ingredients, inventoryCount, expiringCount, servings, budget, strictMode]);

  const handleSelectMenu = async (menuType: string, menuData: any) => {
    if (!menuData) return;
    
    setSelectedMenuType(menuType);
    setSelectedMenuData(menuData);
    setLoadingRecipe(true);
    setErrorRecipe(null);
    setRecipeDetails([]);
    setCurrentDishIndex(0);
    setIsNavBarVisible(false);

    const dishCount = menuData.dishes?.length || 0;
    setTotalDishes(dishCount);

    try {
      const details: RecipeDetail[] = [];
      const servings_num = Number(servings) || 1;

      for (let i = 0; i < menuData.dishes.length; i++) {
        const dish = menuData.dishes[i];
        setRecipeProgressStep(`fetching-dish-${i + 1}`);
        setRetrievingDishName(dish.name);
        
        // SSoT化により、最初から手順(steps)が含まれている想定
        const recipeDetail: RecipeDetail = {
          title: dish.name,
          description: dish.description || menuData.description || "",
          servings: servings_num,
          time_minutes: dish.cookingTime || 20,
          difficulty: dish.difficulty === 1 ? "低" : dish.difficulty === 2 ? "中" : "高",
          ingredients: dish.ingredients?.map((ing: any) => ({
            name: ing.name,
            quantity_per_serving: (Number(ing.amount) || 0) / servings_num,
            unit: ing.unit || "個",
            total_quantity: Number(ing.amount) || 0,
            optional: false,
          })) || [],
          // 手順がない場合はフォールバックを表示（基本的には存在するはず）
          steps: dish.steps && dish.steps.length > 0 
            ? dish.steps 
            : [
                "材料をすべて計量し、下準備を整える",
                "食材を適切に切り分ける",
                "熱したフライパンまたは鍋で調理する",
                "味を整える",
                "器に盛り付ける"
              ],
          tips: dish.tips ? (Array.isArray(dish.tips) ? dish.tips : [dish.tips]) : [],
          timers: [],
          grocery_additions: [],
        };
        
        // UI更新のための微小なウェイト
        await new Promise(resolve => setTimeout(resolve, 100));
        details.push(recipeDetail);
      }
      setRecipeDetails(details);
    } catch (e) {
      console.error("[handleSelectMenu] Error:", e);
      setErrorRecipe("レシピの表示中にエラーが発生しました。");
    } finally {
      setLoadingRecipe(false);
      setRetrievingDishName(null);
      setRecipeProgressStep("fetching-dish-1");
    }
  };

  const handleGenerate = async () => {
    // 既に生成中の場合は新規生成をブロック
    if (loading || currentGenerationId) {
      toast.info("献立生成中です。完了までお待ちください。", {
        id: "generation-in-progress",
      });
      return;
    }
    
    setLoading(true);
    setIsStreaming(true);
    setStreamingText("");
    setThoughtStream([]);
    setError(null);
    setGenerated(null);

    let generationIdForPolling: string | null = null;
    const eventSourceRef = { current: null as EventSource | null };

    try {
      // 1. 献立生成リクエスト（即座にgenerationIdが返る）
      const res = await fetch("/api/menu/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servings,
          budget: enableBudget && budget ? Number(budget) : null,
          mode: strictMode ? "strict" : "flexible",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error ?? "生成の開始に失敗しました");
      }

      const data = await res.json();
      const generationId = data.generationId;
      
      if (!generationId) {
        throw new Error("生成IDが取得できませんでした");
      }

      generationIdForPolling = generationId;
      setCurrentGenerationId(generationId);
      localStorage.setItem(
        "menuGenerationState",
        JSON.stringify({
          loading: true,
          currentGenerationId: generationId,
          timestamp: Date.now(),
        }),
      );

      // 2. SSE接続で進捗を受信
      await new Promise<void>((resolve, reject) => {
        eventSourceRef.current = new EventSource(`/api/menu/stream/${generationId}`);
        
        eventSourceRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
              case "connected":
                // 接続成功
                break;
                
              case "progress":
                // 進捗更新
                if (data.thoughts && Array.isArray(data.thoughts)) {
                  setThoughtStream(data.thoughts);
                }
                setStreamingText(data.thoughts?.join("\n") || "");
                break;
                
              case "complete":
                // 完了
                if (data.menus) {
                  const result = {
                    menuGenerationId: generationId,
                    menus: data.menus,
                    nutrition: data.nutrition,
                    usedIngredients: data.usedIngredients,
                  };
                  setGenerated(result);
                  sessionStorage.setItem("menuGeneratedResult", JSON.stringify(result));
                }
                setIsStreaming(false);
                setLoading(false);
                setCurrentGenerationId(null);
                localStorage.removeItem("menuGenerationState");
                eventSourceRef.current?.close();
                resolve();
                break;
                
              case "error":
                // エラー
                throw new Error(data.error || "献立生成に失敗しました");
                
              case "timeout":
                // タイムアウト
                throw new Error(data.message || "接続がタイムアウトしました");
            }
          } catch (e) {
            reject(e);
          }
        };
        
        eventSourceRef.current.onerror = (error) => {
          console.error("[SSE] Error:", error);
          eventSourceRef.current?.close();
          reject(new Error("SSE接続エラー"));
        };
      });
      
    } catch (err: unknown) {
      console.error("[handleGenerate] Error:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setLoading(false);
      setIsStreaming(false);
      setCurrentGenerationId(null);
      localStorage.removeItem("menuGenerationState");
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    }
  };

  const [loadingCook, setLoadingCook] = useState(false);

  const handleConfirmCook = async () => {
    if (!generated?.menuGenerationId || !selectedMenuType || loadingCook)
      return;

    setLoadingCook(true);
    try {
      const res = await fetch("/api/menu/cook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuGenerationId: generated.menuGenerationId,
          selectedMenu: selectedMenuType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "調理記録に失敗しました");
      }

      alert("調理完了！在庫から食材が差し引かれました。");

      // 全ての状態をリセットして初期画面に戻る
      setGenerated(null);
      sessionStorage.removeItem("menuGeneratedResult");
      setSelectedMenuType(null);
      setSelectedMenuData(null);
      setRecipeDetails([]);
      setCurrentDishIndex(0);
      setIsNavBarVisible(true);
    } catch (e: unknown) {
      alert(`エラーが発生しました: ${e instanceof Error ? e.message : "不明なエラー"}`);
    } finally {
      setLoadingCook(false);
    }
  };

  const closeRecipeModal = () => {
    setSelectedMenuType(null);
    setSelectedMenuData(null);
    setRecipeDetails([]);
    setCurrentDishIndex(0);
    setErrorRecipe(null);
    setIsNavBarVisible(true);
  };

  const currentRecipe = recipeDetails[currentDishIndex];

  return (
    <ErrorBoundary>
      <PageTransition
        className="max-w-4xl mx-auto px-4 py-8 pb-32"
        aria-hidden={!isNavBarVisible}
      >
        <HeaderTransition className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              AI献立提案
            </h1>
            <button
              onClick={() => router.push("/history")}
              className="text-xs flex items-center gap-1 bg-[var(--surface-bg)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--color-text-secondary)] px-3 py-1.5 rounded-full transition"
            >
              <History size={14} />
              履歴
            </button>
          </div>
          <div className="flex items-center" style={{ minHeight: "36px", minWidth: "120px", justifyContent: "flex-end" }}>
            {!isProLoading && isPro === true && (
              <a
                href="/menu/weekly"
                className="text-sm font-medium flex items-center px-3 py-1.5 rounded-full transition whitespace-nowrap"
                style={{
                  background:
                    "color-mix(in srgb, var(--accent) 10%, transparent)",
                  color: "var(--accent)",
                  border: "1px solid var(--surface-border)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "color-mix(in srgb, var(--accent) 20%, transparent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    "color-mix(in srgb, var(--accent) 10%, transparent)";
                }}
              >
                <Calendar size={16} />
                1週間分を作成する
              </a>
            )}
          </div>
        </HeaderTransition>

        <ContentTransition className="space-y-6">
          <div className="flex justify-end" style={{ minHeight: "18px" }}>
            {!isProLoading && isPro === true && (
              <a
                href="/settings/expiration"
                className="text-xs flex items-center gap-1 transition"
                style={{
                  color: "var(--color-text-secondary)",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--color-text-secondary)";
                }}
              >
                <Lightbulb size={12} />
                賞味期限の優先度設定
              </a>
            )}
          </div>

          {!generated && (
            <div className="modal-card rounded-lg shadow-sm p-8 text-center relative overflow-hidden">
              {usage && (
                <div
                  className="absolute top-4 right-4 text-[10px] font-bold px-2 py-1 rounded"
                  style={{
                    background: "var(--surface-bg)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {isPro === true ? "1日3回" : "1日1回"}
                </div>
              )}
              <div className="mb-6">
                <ChefHat
                  size={48}
                  className="mx-auto mb-2"
                  style={{ color: "var(--accent)" }}
                />
                <h2
                  className="text-xl font-medium"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  冷蔵庫の食材から献立を考えます
                </h2>
                <p
                  className="mt-2"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  現在、在庫が{" "}
                  <span
                    className="font-bold"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {inventoryCount ?? "-"}
                  </span>{" "}
                  品あります。
                  <br />
                  そのうち{" "}
                  <span className="font-bold" style={{ color: "#f59e0b" }}>
                    {expiringCount ?? "-"}
                  </span>{" "}
                  品の賞味期限が迫っています。
                </p>
              </div>

              {/* Constraint Mode Toggle - Hidden during loading */}
              {/* Constraint Mode Toggle - Hidden during loading */}
              {!loading && (
                <>
                  <div className="max-w-md mx-auto mb-4">
                    <div className="bg-[var(--surface-bg)] rounded-lg p-4 border border-[var(--surface-border)]">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium flex items-center gap-2 text-[var(--color-text-primary)] cursor-pointer">
                          {strictMode ? (
                            <Lock size={16} className="text-[var(--accent)]" />
                          ) : (
                            <Unlock size={16} className="text-[var(--color-text-muted)]" />
                          )}
                          冷蔵庫内の食材のみで献立を生成
                        </label>
                        <Toggle
                          checked={strictMode}
                          onChange={() => setStrictMode(!strictMode)}
                        />
                      </div>

                      <p className="text-xs text-[var(--color-text-muted)] mt-2">
                        {strictMode
                          ? "ONの場合、現在の在庫にある食材のみで献立を生成します（基本調味料は含まれます）"
                          : "OFFの場合、在庫食材を優先しつつ、不足分を一部許可します"}
                      </p>
                    </div>
                  </div>

                  {/* Conditions UI */}
                  <div className="max-w-md mx-auto mb-8 space-y-4 text-left">
                    {/* Servings */}
                    <div className="bg-[var(--surface-bg)] rounded-lg p-4 border border-[var(--surface-border)]">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium flex items-center gap-2 text-[var(--color-text-primary)]">
                          <Users size={16} className="text-[var(--accent)]" />
                          人数
                        </label>
                        <span className="text-sm font-bold text-[var(--color-text-primary)]">
                          {servings}人前
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="8"
                        value={servings}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (val > 8) {
                            toast("最大8人前までです", {
                              description:
                                "8人以上の献立は分割して生成してください。",
                            });
                            setServings(8);
                          } else {
                            setServings(val);
                          }
                        }}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                      />
                      <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
                        <span>1人</span>
                        <span>8人</span>
                      </div>
                    </div>

                    {/* Budget (Pro Only) */}
                    <div className={`bg-[var(--surface-bg)] rounded-lg p-4 border border-[var(--surface-border)] overflow-hidden relative ${!isPro ? "min-h-[200px]" : ""}`}>
                      {!isPro && (
                        <div className="absolute inset-0 bg-[var(--background)]/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
                          <div className="bg-amber-500 text-white p-3 rounded-2xl mb-3 shadow-xl shadow-amber-100">
                            <Coins size={24} />
                          </div>
                          <h3 className="text-base font-extrabold mb-1 text-[var(--color-text-primary)]">
                            1食あたりの予算設定
                          </h3>
                          <p className="text-xs text-slate-500 mb-4">
                            Proプランで予算を設定できます。コスパ重視や特別な日の献立を調整できます。
                          </p>
                          <button
                            onClick={() => router.push("/settings/account")}
                            className="bg-amber-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-amber-100 hover:scale-105 active:scale-95 transition text-sm"
                          >
                            Proにアップグレード
                          </button>
                        </div>
                      )}
                      <div inert={!isPro || undefined} className={!isPro ? "pointer-events-none" : ""}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium flex items-center gap-2 text-[var(--color-text-primary)]">
                            <Coins size={16} className="text-[var(--accent)]" />
                            1食あたりの予算
                            <span className="text-[10px] bg-[var(--accent)] text-white px-1.5 py-0.5 rounded-full">
                              Pro
                            </span>
                          </label>
                          <Toggle
                            checked={enableBudget}
                            onChange={() => {
                              setEnableBudget(!enableBudget);
                              if (!enableBudget && !budget) setBudget(500);
                            }}
                          />
                        </div>

                        {enableBudget && (
                          <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                            <div className="relative">
                              <input
                                type="number"
                                value={budget}
                                onChange={(e) =>
                                  setBudget(
                                    e.target.value === ""
                                      ? ""
                                      : parseInt(e.target.value),
                                  )
                                }
                                placeholder="例: 500"
                                className="w-full p-2 pl-3 pr-8 border border-[var(--surface-border)] rounded bg-[var(--card-bg)] focus:ring-2 focus:ring-[var(--accent)] focus:outline-none no-spinner"
                              />
                              <span className="absolute right-3 top-2.5 text-sm text-[var(--color-text-muted)]">
                                円/人
                              </span>
                            </div>
                            <p className="text-xs text-[var(--color-text-muted)] mt-1">
                              ※あくまで目安として考慮されます
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {loading && (
                <div className="max-w-md mx-auto mb-8">
                  {/* 設定サマリー（生成中は読み取り専用表示） */}
                  <div className="mb-4 p-4 bg-[var(--surface-bg)] rounded-xl border border-[var(--surface-border)]">
                    <div className="flex items-center gap-2 mb-3 text-[var(--color-text-secondary)]">
                      <Lock size={16} className="text-[var(--accent)]" />
                      <span className="text-xs font-medium uppercase tracking-wider">設定内容</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--color-text-muted)]">モード:</span>
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {strictMode ? "冷蔵庫内の食材のみで生成" : "一部許可モード"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--color-text-muted)]">人数:</span>
                        <span className="font-medium text-[var(--color-text-primary)]">{servings}人前</span>
                      </div>
                      {enableBudget && Number(budget) > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--color-text-muted)]">予算:</span>
                          <span className="font-medium text-[var(--color-text-primary)]">{budget}円/人</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${loading ? "cursor-not-allowed" : ""}`}
                style={{
                  background: loading
                    ? "color-mix(in srgb, var(--accent) 70%, transparent)"
                    : "var(--accent)",
                  color: "#fff",
                }}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    AIが考え中...
                  </>
                ) : (
                  "献立を提案してもらう"
                )}
              </button>

              {loading && (
                <div className="mt-8 max-w-lg mx-auto">
                  <div className="relative mb-6 flex justify-center">
                    <motion.div
                      animate={{
                        rotate: [0, 5, -5, 0],
                        scale: [1, 1.1, 1],
                        filter: [
                          "hue-rotate(0deg) brightness(1)",
                          "hue-rotate(30deg) brightness(1.2)",
                          "hue-rotate(-30deg) brightness(1.2)",
                          "hue-rotate(0deg) brightness(1)"
                        ]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      style={{
                        filter: "drop-shadow(0 0 20px var(--accent))"
                      }}
                    >
                      <ChefHat size={56} className="text-[var(--accent)]" />
                    </motion.div>
                  </div>

                  {/* AI Thought Stream UI */}
                  <div className="modal-card rounded-xl p-6 mb-6 text-left border border-[var(--surface-border)] bg-[var(--surface-bg)] shadow-lg overflow-hidden relative">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--surface-border)]">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                      </div>
                      <span className="text-[10px] font-mono text-[var(--color-text-muted)] ml-2 uppercase tracking-widest">
                        AI Thought Stream
                      </span>
                    </div>

                    <div className="space-y-3 font-mono">
                      {thoughtStream.length > 0 ? (
                        thoughtStream.map((thought, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex gap-3 text-xs leading-relaxed"
                          >
                            <span className="text-[var(--accent)] shrink-0">›</span>
                            <span className="text-[var(--color-text-primary)]">{thought}</span>
                          </motion.div>
                        ))
                      ) : (
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={currentThoughtIndex}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.3 }}
                            className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]"
                          >
                            <span className="text-[var(--accent)]">›</span>
                            <span>
                              {shuffledMessagesRef.current[currentThoughtIndex] ?? "献立を生成中..."}
                            </span>
                          </motion.div>
                        </AnimatePresence>
                      )}
                      
                      {isStreaming && (
                        <div className="flex gap-3 text-xs">
                          <span className="text-[var(--accent)] shrink-0">›</span>
                          <motion.span 
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="w-1.5 h-4 bg-[var(--accent)] inline-block"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 px-4">
                    <div className="relative h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        className="absolute top-0 left-0 h-full bg-[var(--accent)]"
                        initial={{ width: "0%" }}
                        animate={{ 
                          width: generated ? "100%" : (isStreaming ? "70%" : "90%")
                        }}
                        transition={{ duration: 1 }}
                      />
                    </div>

                    <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-tighter">
                      {isStreaming ? "AI Generating Plan..." : "Finalizing Recipe Details..."}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 text-[var(--semantic-red)] bg-red-50 dark:bg-red-950/20 p-3 rounded flex items-center gap-2 justify-center border border-red-100 dark:border-red-900/30">
                  <AlertTriangle size={16} />
                  {error}
                  <button
                    onClick={handleGenerate}
                    className="ml-2 underline text-sm"
                  >
                    再試行
                  </button>
                </div>
              )}

              {/* Strict モード失敗モーダル (INSUFFICIENT_INVENTORY) */}
              <AnimatePresence>
                {insufficientError && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={() => setInsufficientError(false)}
                  >
                    <motion.div
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      className="modal-card rounded-xl shadow-xl p-6 max-w-sm w-full relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setInsufficientError(false)}
                        className="absolute top-3 right-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition"
                      >
                        <X size={18} />
                      </button>

                      <div className="text-center">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                          <AlertTriangle size={24} className="text-amber-500" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
                          献立を生成できません
                        </h3>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                          現在の在庫では条件を満たす献立を作成できません。食材を追加するか、モードを「一部許可」に変更して再度お試しください。
                        </p>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              setInsufficientError(false);
                              setStrictMode(false);
                            }}
                            className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white transition"
                            style={{ background: "var(--accent)" }}
                          >
                            <Unlock size={14} className="inline mr-1" />
                            「一部許可」モードに切り替え
                          </button>
                          <button
                            onClick={() => {
                              setInsufficientError(false);
                              router.push("/features/ingredients-recipes");
                            }}
                            className="w-full py-2.5 px-4 rounded-lg text-sm font-medium transition border"
                            style={{
                              borderColor: "var(--surface-border)",
                              color: "var(--color-text-primary)",
                            }}
                          >
                            <ShoppingCart size={14} className="inline mr-1" />
                            食材を追加する
                          </button>
                          <button
                            onClick={() => setInsufficientError(false)}
                            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition"
                          >
                            閉じる
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {generated && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--color-text-primary)]">
                  <CheckCircle size={20} className="text-green-500" />
                  おすすめの献立
                </h2>
                <button
                  onClick={() => {
                    setGenerated(null);
                    sessionStorage.removeItem("menuGeneratedResult");
                  }}
                  className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1"
                >
                  <ArrowLeft size={14} />
                  戻る
                </button>
              </div>

              {/* 2案 + 比較 + 軽量サジェストの表示 */}
              <div className="space-y-6">
                {/* メインカードエリア */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* バランス最適案 */}
                  <MenuResultCard
                    type="main"
                    menu={{
                      name: generated.menus.main?.title ?? "献立",
                      description: generated.menus.main?.reason ?? "",
                      cookingTime: calculateCookingTime(
                        generated.menus.main?.dishes ?? [],
                      ),
                      difficulty: calculateDifficulty(
                        generated.menus.main?.dishes ?? [],
                      ),
                      dishes: generated.menus.main?.dishes ?? [],
                      role: generated.menus.main?.role ?? "balanced",
                    }}
                    scores={{
                      inventoryUsage: generated.nutrition?.scores?.main?.inventoryUsage ?? 75,
                      costEfficiency: generated.nutrition?.scores?.main?.costEfficiency ?? 75,
                      healthScore: generated.nutrition?.scores?.main?.healthScore ?? 75,
                      timeEfficiency: generated.nutrition?.scores?.main?.timeEfficiency,
                    }}
                    availability={
                      generated.usedIngredients?.main ?? {
                        available: [],
                        missing: [],
                        insufficient: [],
                      }
                    }
                    nutrition={generated.nutrition?.main}
                    onSelect={() => handleSelectMenu("main", generated.menus.main)}
                    isBest={true}
                    isPro={isPro === true}
                    onAddToShoppingList={handleAddToShoppingList}
                  />

                  {/* 特化案 */}
                  <MenuResultCard
                    type="alternative"
                    menu={{
                      name: generated.menus.alternativeA?.title ?? "代替案",
                      description: generated.menus.alternativeA?.reason ?? "",
                      cookingTime: calculateCookingTime(
                        generated.menus.alternativeA?.dishes ?? [],
                      ),
                      difficulty: calculateDifficulty(
                        generated.menus.alternativeA?.dishes ?? [],
                      ),
                      dishes: generated.menus.alternativeA?.dishes ?? [],
                      role: generated.menus.alternativeA?.role ?? "timeOptimized",
                      specializationReason: generated.menus.alternativeA?.specializationReason,
                    }}
                    scores={{
                      inventoryUsage: generated.nutrition?.scores?.altA?.inventoryUsage ?? 70,
                      costEfficiency: generated.nutrition?.scores?.altA?.costEfficiency ?? 70,
                      healthScore: generated.nutrition?.scores?.altA?.healthScore ?? 70,
                      timeEfficiency: generated.nutrition?.scores?.altA?.timeEfficiency,
                    }}
                    availability={
                      generated.usedIngredients?.altA ?? {
                        available: [],
                        missing: [],
                        insufficient: [],
                      }
                    }
                    nutrition={generated.nutrition?.altA}
                    onSelect={() => handleSelectMenu("altA", generated.menus.alternativeA)}
                    isPro={isPro === true}
                    onAddToShoppingList={handleAddToShoppingList}
                  />
                </div>

                {/* 比較バー */}
                <MenuComparisonBar
                  comparison={{
                    mainPlan: {
                      inventoryUsage: generated.menus.main?.scores?.inventoryUsage ?? 75,
                      costEfficiency: generated.menus.main?.scores?.costEfficiency ?? 75,
                      healthScore: generated.menus.main?.scores?.healthScore ?? 75,
                      timeEfficiency: generated.menus.main?.scores?.timeEfficiency,
                    },
                    alternativePlan: {
                      inventoryUsage: generated.menus.alternativeA?.scores?.inventoryUsage ?? 70,
                      costEfficiency: generated.menus.alternativeA?.scores?.costEfficiency ?? 70,
                      healthScore: generated.menus.alternativeA?.scores?.healthScore ?? 70,
                      timeEfficiency: generated.menus.alternativeA?.scores?.timeEfficiency,
                    },
                    summary: generated.nutrition?.comparison?.summary,
                  }}
                  mainRole={generated.menus.main?.role ?? "balanced"}
                  alternativeRole={generated.menus.alternativeA?.role ?? "timeOptimized"}
                  isPro={isPro === true}
                />

                {/* 軽量サジェスト */}
                {generated.nutrition?.lightSuggestion && (
                  <MenuLightSuggestion
                    suggestion={{
                      text: generated.nutrition.lightSuggestion.text,
                      label: generated.nutrition.lightSuggestion.label,
                      confidence: generated.nutrition.lightSuggestion.confidence,
                      hint: generated.nutrition.lightSuggestion.hint,
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </ContentTransition>
      </PageTransition>

      {/* Recipe Detail Modal */}
      <AnimatePresence>
        {selectedMenuType && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.stopPropagation()} // 背景クリックを無効化
          >
            {/* アプリ内の操作のみ無効化するオーバーレイ */}
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 max-h-[90vh] bg-[var(--card-bg)] border border-[var(--surface-border)] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col relative z-30"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="recipe-modal-title"
            >
              {/* Header */}
              <div className="sticky top-0 bg-[var(--card-bg)] border-b border-[var(--surface-border)] px-4 py-3 flex items-center justify-center z-10">
                <h2 id="recipe-modal-title" className="font-bold text-lg text-[var(--color-text-primary)]">
                  {selectedMenuData?.title ?? "レシピ詳細"}
                </h2>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 pb-32">
                {loadingRecipe ? (
                  <div className="mt-8 max-w-lg mx-auto">
                    {/* 設定サマリー（生成中は読み取り専用表示） */}
                    <div className="mb-6 p-4 bg-[var(--surface-bg)] rounded-xl border border-[var(--surface-border)]">
                      <div className="flex items-center gap-2 mb-3 text-[var(--color-text-secondary)]">
                        <Lock size={16} className="text-[var(--accent)]" />
                        <span className="text-xs font-medium uppercase tracking-wider">設定内容</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--color-text-muted)]">モード:</span>
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {strictMode ? "冷蔵庫内の食材のみで生成" : "一部許可モード"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--color-text-muted)]">人数:</span>
                          <span className="font-medium text-[var(--color-text-primary)]">{servings}人前</span>
                        </div>
                        {enableBudget && Number(budget) > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--color-text-muted)]">予算:</span>
                            <span className="font-medium text-[var(--color-text-primary)]">{budget}円/人</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="relative mb-6 flex justify-center">
                      {/* 書き込み中のアニメーション */}
                      <motion.div
                        animate={{
                          x: [0, 5, -5, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <ChefHat size={48} className="text-[var(--accent)] opacity-80" />
                      </motion.div>
                    </div>

                    <div className="max-w-xs mx-auto space-y-4">
                      <h4 className="text-lg font-bold text-[var(--color-text-primary)]">
                        レシピを取得中...
                      </h4>
                      
                      <div className="space-y-4">
                        <div className="relative h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            className="absolute top-0 left-0 h-full bg-[var(--accent)]"
                            initial={{ width: "0%" }}
                            animate={{ width: `${(parseInt(recipeProgressStep?.split('-')[2] || "1") || 1) / totalDishes * 100}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>

                        <AnimatePresence mode="wait">
                          <motion.p
                            key={recipeProgressStep}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-sm font-medium text-[var(--color-text-secondary)]"
                          >
                            {recipeProgressStep === "fetching-dish-1" && "1品目取得中"}
                            {recipeProgressStep === "fetching-dish-2" && "2品目取得中"}
                            {recipeProgressStep === "fetching-dish-3" && "3品目取得中"}
                          </motion.p>
                        </AnimatePresence>
                      </div>

                      <div className="p-4 bg-[var(--surface-bg)] rounded-2xl border border-[var(--surface-border)] relative overflow-hidden">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--semantic-green-bg)] flex items-center justify-center flex-shrink-0">
                            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                          <p className="text-sm font-medium text-left text-[var(--color-text-secondary)] truncate">
                            {retrievingDishName}
                          </p>
                        </div>
                        <motion.div
                          className="absolute bottom-0 left-0 h-0.5 bg-green-500"
                          animate={{
                            width: ["0%", "100%"]
                          }}
                          transition={{
                            duration: 8,
                            repeat: Infinity,
                          }}
                        />
                      </div>
                      <p className="text-[var(--color-text-muted)] text-xs">
                        プロのシェフが手順をていねいに解説しています
                      </p>
                    </div>
                  </div>
                ) : recipeDetails.length > 0 ? (
                  <>
                    {/* Dish Tabs - レシピ取得中は非表示 */}
                    {recipeDetails.length > 1 && !loadingRecipe && (
                      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        {recipeDetails.map((r, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentDishIndex(idx)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${currentDishIndex === idx
                              ? "bg-[var(--accent)] text-white"
                              : "bg-[var(--surface-bg)] text-[var(--color-text-secondary)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
                              }`}
                          >
                            {r.title}
                          </button>
                        ))}
                      </div>
                    )}

                    {currentRecipe && (
                      <div className="space-y-6">
                        {/* Title & Info */}
                        <div>
                          <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                            {currentRecipe.title}
                          </h3>
                          {currentRecipe.description && (
                            <p className="text-[var(--color-text-secondary)] text-sm">
                              {currentRecipe.description}
                            </p>
                          )}
                          <div className="flex gap-4 mt-3 text-sm text-[var(--color-text-secondary)]">
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {recipeDetails.reduce((sum, r) => sum + (r.time_minutes || 0), 0)}分（合計）
                            </span>
                            <span>難易度: {currentRecipe.difficulty}</span>
                            <span>{currentRecipe.servings}人前</span>
                          </div>
                        </div>

                        {/* Ingredients */}
                        <div className="bg-[var(--surface-bg)] rounded-xl p-4 border border-[var(--surface-border)]">
                          <h4 className="font-bold text-[var(--color-text-primary)] mb-3">
                            材料
                          </h4>
                          <ul className="space-y-2">
                            {currentRecipe.ingredients.map((ing, idx) => (
                              <li
                                key={idx}
                                className="flex justify-between text-sm border-b border-[var(--surface-border)] pb-1"
                              >
                                <span className="text-[var(--color-text-primary)]">
                                  {ing.name}
                                  {ing.optional && (
                                    <span className="text-xs text-[var(--color-text-muted)] ml-1">
                                      (お好みで)
                                    </span>
                                  )}
                                </span>
                                <span className="text-[var(--color-text-secondary)]">
                                  {ing.total_quantity}
                                  {ing.unit}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Steps */}
                        <div>
                          <h4 className="font-bold text-[var(--color-text-primary)] mb-3">
                            作り方
                          </h4>
                          <ol className="space-y-4">
                            {currentRecipe.steps.map((step, idx) => (
                              <li key={idx} className="flex gap-3">
                                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--accent)] text-sm font-bold flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <p className="text-[var(--color-text-primary)] text-sm leading-relaxed pt-0.5">
                                  {step}
                                </p>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Tips */}
                        {currentRecipe.tips &&
                          currentRecipe.tips.length > 0 && (
                            <div className="bg-[color-mix(in_srgb,#f59e0b_10%,transparent)] border border-[color-mix(in_srgb,#f59e0b_20%,transparent)] rounded-xl p-4">
                              <h4 className="font-bold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1">
                                <Lightbulb size={16} />
                                コツ・ポイント
                              </h4>
                              <ul className="space-y-1">
                                {currentRecipe.tips.map((tip, idx) => (
                                  <li
                                    key={idx}
                                    className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2"
                                  >
                                    <span className="text-amber-500">•</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {/* Storage */}
                        {currentRecipe.storage && (
                          <div className="text-sm text-[var(--color-text-secondary)] bg-[var(--surface-bg)] rounded-lg p-3 border border-[var(--surface-border)]">
                            <span className="font-medium text-[var(--color-text-primary)]">
                              保存方法:
                            </span>{" "}
                            {currentRecipe.storage}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : errorRecipe ? (
                  <div className="text-center py-20 px-6">
                    <AlertTriangle size={40} className="mx-auto mb-4 text-red-500" />
                    <p className="text-[var(--color-text-primary)] font-medium mb-4">
                      {errorRecipe}
                    </p>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => handleSelectMenu(selectedMenuType as string, selectedMenuData)}
                        className="w-full py-3 bg-[var(--accent)] text-white rounded-xl font-bold shadow-md hover:opacity-90 transition"
                      >
                        再取得する
                      </button>
                      <button
                        onClick={closeRecipeModal}
                        className="w-full py-3 bg-[var(--surface-bg)] text-[var(--color-text-secondary)] rounded-xl font-bold border border-[var(--surface-border)] hover:bg-[var(--surface-border)] transition"
                      >
                        戻る
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-[var(--color-text-secondary)]">
                    レシピを取得できませんでした
                  </div>
                )}
              </div>

              {!loadingRecipe && !errorRecipe && recipeDetails.length > 0 && (
                <div className="sticky bottom-0 bg-[var(--card-bg)] border-t border-[var(--surface-border)] p-4 pb-safe relative z-20">
                  <button
                    onClick={handleConfirmCook}
                    disabled={loadingCook}
                    aria-label="調理完了。完成ボタン"
                    className={`w-full py-4 rounded-xl font-bold shadow-lg transition flex items-center justify-center gap-2 ${loadingCook
                      ? "bg-[var(--surface-bg)] cursor-not-allowed text-[var(--color-text-muted)]"
                      : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                  >
                    {loadingCook ? (
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      <CheckCircle size={20} />
                    )}
                    {loadingCook ? "処理中..." : "調理完了！完成"}
                  </button>
                  <p className="text-center text-[10px] text-[var(--color-text-muted)] mt-2">
                    使用した食材が在庫から差し引かれます
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 以前ここに NavBar がありましたが、RootLayout に統合されました */}
    </ErrorBoundary>
  );
}

// Suspenseでラップしてexport
export default function MenuGeneratePageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <MenuGeneratePage />
    </Suspense>
  );
}
