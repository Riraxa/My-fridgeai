import { addDays, format, differenceInDays } from "date-fns";
import { ja } from "date-fns/locale";
import { generateWeeklyPlanAI } from "./ai/menu-generator";
import { checkIngredientAvailability } from "./inventory";
import { Ingredient, UserPreferences } from "@prisma/client";

import { WeeklyDayPlanEntry, GeneratedDish } from "./agents/schemas/menu";

export interface DailyMenuPlan {
  date: Date;
  dayOfWeek: string;
  menu: {
    main: WeeklyDayPlanEntry;
    alternativeA?: WeeklyDayPlanEntry;
  };
  expiringItems: string[];
}

export interface WeeklyMenuResult {
  weeklyMenus: DailyMenuPlan[];
  shoppingList: string[];
}

export async function generateWeeklyMenus(
  initialInventory: Ingredient[],
  preferences: UserPreferences | null,
  startDate: Date = new Date(),
): Promise<WeeklyMenuResult> {
  // 1. Identify Expiring Items (Global)
  const expiringSoon = initialInventory.filter((i) => {
    if (!i.expirationDate) return false;
    const diff = differenceInDays(i.expirationDate, new Date());
    return diff <= 5 && diff >= -2;
  });

  // 2. Generate 7 Days in ONE call (Performance Optimization)
  let aiResults;
  try {
    aiResults = await generateWeeklyPlanAI(
      initialInventory,
      preferences,
    );
  } catch (e) {
    console.error("Weekly Gen failed", e);
    throw e;
  }

  // 3. Map to Weekly Structure
  const weeklyMenus: DailyMenuPlan[] = (aiResults as WeeklyDayPlanEntry[]).map(
    (dayPlan: WeeklyDayPlanEntry, index: number) => {
      const date = addDays(startDate, index);

      // Find expiring items relevant to this day (simple heuristic)
      // We list items that expire strictly ON or BEFORE this day?
      // Or just general warning.
      const relevantExpiring = expiringSoon
        .filter((i) => {
          if (!i.expirationDate) return false;
          const diff = differenceInDays(i.expirationDate, date);
          return diff <= 2 && diff >= -1;
        })
        .map((i) => i.name);

      return {
        date: date,
        dayOfWeek: format(date, "EEEE", { locale: ja }),
        menu: {
          main: dayPlan, // The AI result is the "Main" menu
          alternativeA: { title: "提案なし", reason: "", tags: [], dishes: [] },
        },
        expiringItems: relevantExpiring,
      };
    },
  );

  // 4. Calculate Consolidated Shopping List
  // We assume the AI tried to use inventory.
  // We verify what is actually missing based on the plan.
  const allDishes = weeklyMenus.flatMap((d) => d.menu.main.dishes);
  const allRequired = allDishes.flatMap((d: GeneratedDish) => d.ingredients ?? []);

  const { missing, insufficient } = checkIngredientAvailability(
    allRequired,
    initialInventory,
  );

  const shoppingList = [
    ...missing.map((i) => i.name),
    ...insufficient.map((i) => i.name),
  ];

  const uniqueShoppingList = Array.from(new Set(shoppingList));

  return {
    weeklyMenus,
    shoppingList: uniqueShoppingList,
  };
}
