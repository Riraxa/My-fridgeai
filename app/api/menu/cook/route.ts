import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateInventoryUpdates } from "@/lib/inventory";
import { addHours } from "date-fns";
import { normalizeIngredientKey } from "@/lib/taste/normalizeIngredientKey";
import { isTasteLearningEnabled } from "@/lib/featureFlags";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const userId = session.user.id;
    const body = await req.json();
    const { menuGenerationId, selectedMenu, cookedDishes, usedIngredients } =
      body;
    // cookedDishes: e.g., ["主菜", "副菜"] (names or types)
    // usedIngredients: optional, provided if menuGenerationId is missing

    let usedIngredientsList: any[] = [];
    let _cookedDishesList: string[] = cookedDishes ?? [];

    // 1. Get Generation Record (if provided)
    if (menuGenerationId) {
      const generation = await prisma.menuGeneration.findUnique({
        where: { id: menuGenerationId },
      });

      if (generation?.userId !== userId) {
        return NextResponse.json({ error: "Menu not found" }, { status: 404 });
      }

      // 2. Identify Selected Menu and Ingredients
      let menuData: any;
      if (!generation) {
        return NextResponse.json({ error: "Menu not found" }, { status: 404 });
      }

      if (selectedMenu === "main") menuData = generation.mainMenu;
      else if (selectedMenu === "altA") menuData = generation.alternativeA;
      else if (selectedMenu === "altB") menuData = generation.alternativeB;
      else menuData = generation.mainMenu; // Default

      // Extract ingredients from cooked dishes
      if (Array.isArray(menuData.dishes)) {
        for (const dish of menuData.dishes) {
          // If cookedDishes is provided, filter. Else assume all cooked.
          if (
            !cookedDishes ||
            cookedDishes.includes(dish.type) ||
            cookedDishes.includes(dish.name)
          ) {
            if (!_cookedDishesList.includes(dish.name)) {
              _cookedDishesList.push(dish.name);
            }
            usedIngredientsList.push(...dish.ingredients);
          }
        }
      }
    } else {
      // Manual cook action
      if (!usedIngredients || !Array.isArray(usedIngredients)) {
        return NextResponse.json(
          { error: "Missing menuGenerationId or usedIngredients" },
          { status: 400 },
        );
      }
      usedIngredientsList = usedIngredients;
    }

    // 3. Calculate Inventory Updates
    const inventory = await prisma.ingredient.findMany({ where: { userId } });

    // 3.1. Track which ingredients existed in original inventory for proper restoration
    const originalInventoryNames = new Set(
      inventory.map((item) => item.name.toLowerCase().trim()),
    );

    const usedIngredientsWithOrigin = usedIngredientsList.map((ingredient) => ({
      ...ingredient,
      existedInOriginalInventory: originalInventoryNames.has(
        ingredient.name.toLowerCase().trim(),
      ),
    }));

    const { update, delete: del } = calculateInventoryUpdates(
      usedIngredientsList,
      inventory,
    );

    // 4. Transaction: Update Inventory & Create History
    await prisma.$transaction(async (tx) => {
      // Apply updates
      for (const op of update) {
        await tx.ingredient.update({ where: { id: op.id }, data: op.data });
      }
      for (const op of del) {
        try {
          await tx.ingredient.delete({ where: { id: op.id } });
        } catch (e: any) {
          // 既に削除されている場合は無視（race condition対応）
          if (e.code === 'P2025') {
            console.log(`[Cook] Ingredient ${op.id} already deleted, skipping`);
          } else {
            throw e;
          }
        }
      }

      // Create History
      await tx.cookingHistory.create({
        data: {
          userId,
          menuGenerationId,
          cookedDishes: _cookedDishesList,
          usedIngredients: usedIngredientsWithOrigin,
          cancellableUntil: addHours(new Date(), 24),
        },
      });

      // Update generation selection if exists
      if (menuGenerationId) {
        await tx.menuGeneration.update({
          where: { id: menuGenerationId },
          data: { selectedMenu: selectedMenu ?? "main" },
        });
      }

      // 利用履歴を記録
      await tx.usageHistory.create({
        data: {
          userId,
          action: "COMPLETE_COOKING",
          meta: {
            menuGenerationId,
            selectedMenu,
            cookedDishes: _cookedDishesList,
            completedAt: new Date().toISOString(),
          } as any,
        },
      });

      // TasteEvent記録（利用した食材を"used"イベントとして記録）
      if (isTasteLearningEnabled()) {
        const uniqueIngredients = new Map<string, { name: string; amount: number }>();
        
        // 重複を排除して集計
        for (const ing of usedIngredientsList) {
          if (!ing || !ing.name) continue;
          const key = normalizeIngredientKey(ing.name);
          const existing = uniqueIngredients.get(key);
          if (existing) {
            existing.amount += ing.amount || 0;
          } else {
            uniqueIngredients.set(key, { name: ing.name, amount: ing.amount || 0 });
          }
        }

        // 各食材をTasteEventとして記録（30分集約ウィンドウ内）
        for (const [key, data] of uniqueIngredients) {
          try {
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
            
            // 既存イベントを検索（30分以内の同一イベント）
            const existingEvent = await tx.tasteEvent.findFirst({
              where: {
                userId,
                ingredientKey: key,
                eventType: "used",
                createdAt: { gte: thirtyMinutesAgo },
              },
            });

            if (existingEvent) {
              // 集約: weight加算
              const newWeight = Math.min(existingEvent.weight + 1.0, 10);
              await tx.tasteEvent.update({
                where: { id: existingEvent.id },
                data: { weight: newWeight },
              });
            } else {
              // 新規作成
              await tx.tasteEvent.create({
                data: {
                  userId,
                  mealPlanResultId: menuGenerationId,
                  ingredientKey: key,
                  eventType: "used",
                  weight: 1.0,
                  source: "cook",
                },
              });
            }
          } catch (e) {
            // TasteEvent記録失敗は全体の失敗にしない
            console.error("[TasteEvent] Failed to record:", key, e);
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Cooking recorded and inventory updated",
    });
  } catch (error) {
    console.error("Cooking Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
