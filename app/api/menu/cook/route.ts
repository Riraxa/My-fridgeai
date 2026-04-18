import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateInventoryUpdates } from "@/lib/inventory";
import { addHours } from "date-fns";
import { normalizeIngredientKey } from "@/lib/taste/normalizeIngredientKey";
import { isTasteLearningEnabled } from "@/lib/featureFlags";
import { checkIdempotency, recordIdempotency } from "@/lib/idempotency";
import { parseMenuData } from "@/lib/prisma-safe";
import { MenuCookSchema } from "@/lib/validations/api-schemas";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const userId = session.user.id;
    const body = await req.json().catch(() => ({}));
    const validation = MenuCookSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        error: "Invalid request data", 
        details: validation.error.format() 
      }, { status: 400 });
    }

    const { menuGenerationId, selectedMenu, cookedDishes, usedIngredients, idempotencyKey } = validation.data;

    // 0. Idempotency check
    if (idempotencyKey) {
      const cached = await checkIdempotency("MENU_COOK", idempotencyKey, userId);
      if (cached) {
        return NextResponse.json({
          success: true,
          message: "Cooking recorded and inventory updated (idempotent)",
          idempotent: true,
        });
      }
    }
    // cookedDishes: e.g., ["主菜", "副菜"] (names or types)
    // usedIngredients: optional, provided if menuGenerationId is missing

    let usedIngredientsList: Array<{ name: string; amount?: number; unit?: string }> = [];
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
      if (!generation) {
        return NextResponse.json({ error: "Menu not found" }, { status: 404 });
      }

      let rawMenuData: Record<string, unknown>;
      if (selectedMenu === "main") rawMenuData = generation.mainMenu as Record<string, unknown>;
      else if (selectedMenu === "altA") rawMenuData = generation.alternativeA as Record<string, unknown>;
      else rawMenuData = generation.mainMenu as Record<string, unknown>; // Default

      const menuData = parseMenuData(rawMenuData);

      // Extract ingredients from cooked dishes
      if (Array.isArray(menuData.dishes)) {
        for (const dish of menuData.dishes) {
          // If cookedDishes is provided, filter. Else assume all cooked.
          if (
            !cookedDishes ||
            cookedDishes.includes(dish.type ?? "") ||
            cookedDishes.includes(dish.name)
          ) {
            if (!_cookedDishesList.includes(dish.name)) {
              _cookedDishesList.push(dish.name);
            }
            usedIngredientsList.push(...dish.ingredients.map(ing => ({ name: ing.name, amount: ing.amount ?? undefined, unit: ing.unit ?? undefined })));
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
      usedIngredientsList = (usedIngredients || []).map(ing => ({ name: ing.name, amount: ing.amount ?? undefined, unit: ing.unit ?? undefined }));
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
      usedIngredientsList as Array<{ name: string; amount: number; unit: string }>,
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
        } catch (e: unknown) {
          // 既に削除されている場合は無視（race condition対応）
          const prismaErr = e as { code?: string };
          if (prismaErr.code === 'P2025') {
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

      // TasteEvent記録（利用した食材を"used"イベントとして記録）
      if (isTasteLearningEnabled()) {
        const uniqueIngredients = new Map<string, { name: string; amount: number }>();
        
        // 重複を排除して集計
        for (const ing of usedIngredientsList) {
          if (!ing?.name) continue;
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

    // 4. 利用履歴を記録 (Telemetry)
    const { recordServerEvent } = await import("@/lib/telemetry-server");
    await recordServerEvent(userId, "API", "COMPLETE_COOKING", {
      menuGenerationId,
      selectedMenu,
      cookedDishes: _cookedDishesList,
    });

    if (idempotencyKey) {
      await recordIdempotency("MENU_COOK", idempotencyKey, userId, { menuGenerationId });
    }

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
