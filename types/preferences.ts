export interface PreferenceResponse {
  preferences: {
    cookingSkill: string;
    aiMessageEnabled: boolean;
    proFeaturesUnlocked: boolean;
    comfortableMethods: string[];
    avoidMethods: string[];
    kitchenEquipment: string[];
    kitchenCookware: string[];
    implicitIngredients: string[];
  };
  allergies: Array<{ id: string; allergen: string; label: string | null }>;
  restrictions: Array<{ id: string; type: string; note: string | null }>;
}
