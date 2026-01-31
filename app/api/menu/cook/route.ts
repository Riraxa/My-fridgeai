//app/api/menu/cook/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateInventoryUpdates } from "@/lib/inventory";
import { addHours } from "date-fns";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
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
    let _cookedDishesList: string[] = cookedDishes || [];

    // 1. Get Generation Record (if provided)
    if (menuGenerationId) {
      const generation = await prisma.menuGeneration.findUnique({
        where: { id: menuGenerationId },
      });

      if (!generation || generation.userId !== userId) {
        return NextResponse.json({ error: "Menu not found" }, { status: 404 });
      }

      // 2. Identify Selected Menu and Ingredients
      let menuData: any;
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
        await tx.ingredient.delete({ where: { id: op.id } });
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
          data: { selectedMenu: selectedMenu || "main" },
        });
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
