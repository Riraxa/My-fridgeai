export type TasteScore = -2 | -1 | 0 | 1 | 2;

export interface TasteJson {
  tasteScores: Record<string, TasteScore>;
  tasteLabels: Record<string, string>;
  equipment: string[];
  preferredMethods: string[];
  avoidedMethods: string[];
  lifestyle: {
    weekdayMode: LifestyleMode;
    weekendMode: LifestyleMode;
    defaultMode: LifestyleMode;
  };
  goals?: string[];
  freeText?: string;
  freeTextMeta?: {
    length: number;
    filtered: boolean;
  };
  recentGenrePenalty?: Record<string, number>;
}

export interface LifestyleMode {
  timePriority: "short" | "normal" | "long";
  dishwashingAvoid: boolean;
  singlePan: boolean;
}

export interface PreferenceResponse {
  preferences: {
    cookingSkill: string;
    tasteJson: TasteJson;
    aiMessageEnabled: boolean;
    proFeaturesUnlocked: boolean;
  };
  allergies: Array<{ id: string; allergen: string; label: string | null }>;
  restrictions: Array<{ id: string; type: string; note: string | null }>;
}
