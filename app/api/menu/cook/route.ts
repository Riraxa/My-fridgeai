import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  calculateInventoryUpdates,
  increaseAmountLevel,
} from "@/lib/inventory";
import { addHours } from "date-fns";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const body = await req.json();
    const { menuGenerationId, selectedMenu, cookedDishes } = body;
    // cookDishes: e.g., ["主菜", "副菜"] (names or types)

    if (!menuGenerationId) {
      return NextResponse.json(
        { error: "Missing menuGenerationId" },
        { status: 400 },
      );
    }

    // 1. Get Generation Record
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
    // Assuming menuData.dishes matches the structure
    const usedIngredientsList: any[] = [];
    const _cookedDishesList: string[] = [];

    if (Array.isArray(menuData.dishes)) {
      for (const dish of menuData.dishes) {
        // If cookedDishes is provided, filter. Else assume all cooked.
        if (
          !cookedDishes ||
          cookedDishes.includes(dish.type) ||
          cookedDishes.includes(dish.name)
        ) {
          _cookedDishesList.push(dish.name);
          usedIngredientsList.push(...dish.ingredients);
        }
      }
    }

    // 3. Calculate Inventory Updates
    const inventory = await prisma.ingredient.findMany({ where: { userId } });
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
          usedIngredients: usedIngredientsList,
          cancellableUntil: addHours(new Date(), 24),
        },
      });

      // Update generation selection
      await tx.menuGeneration.update({
        where: { id: menuGenerationId },
        data: { selectedMenu: selectedMenu || "main" },
      });
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
