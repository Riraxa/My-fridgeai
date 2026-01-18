import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { increaseAmountLevel } from "@/lib/inventory";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { cookingHistoryId } = await req.json();

    const history = await prisma.cookingHistory.findUnique({
      where: { id: cookingHistoryId },
    });

    if (!history || history.userId !== userId) {
      return NextResponse.json({ error: "History not found" }, { status: 404 });
    }

    if (history.status === "cancelled") {
      return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
    }

    if (new Date() > history.cancellableUntil) {
      return NextResponse.json(
        { error: "Cancellation period expired" },
        { status: 400 },
      );
    }

    // Restore Inventory
    const usedIngredients = history.usedIngredients as any[]; // [{name, amount, unit}]

    // We need to restore based on name match logic again
    const inventory = await prisma.ingredient.findMany({ where: { userId } });

    await prisma.$transaction(async (tx) => {
      for (const used of usedIngredients) {
        // Find matching ingredient to restore to.
        // If deleted, we might need to recreate?
        // Logic: If user has ingredient with same name, add back.
        // If not, recreate it!

        let stock = inventory.find(
          (i) =>
            i.name.toLowerCase().trim() === used.name.toLowerCase().trim() ||
            i.name.toLowerCase().startsWith(used.name.toLowerCase()) ||
            used.name.toLowerCase().startsWith(i.name.toLowerCase()),
        );

        // Re-fetch to be sure if inside transaction? matching logic is local though.

        if (stock) {
          if (stock.amount !== null) {
            // Add back amount
            await tx.ingredient.update({
              where: { id: stock.id },
              data: { amount: { increment: used.amount } },
            });
          } else if (stock.amountLevel) {
            // Increase level
            const newLevel = increaseAmountLevel(stock.amountLevel);
            await tx.ingredient.update({
              where: { id: stock.id },
              data: { amountLevel: newLevel },
            });
          }
        } else {
          // Ingredient was deleted or didn't exist?
          // If it was deleted (consumed entirely), we should ideally restore it.
          // Recreating as "Ordinary" or specific amount
          if (used.amount) {
            await tx.ingredient.create({
              data: {
                userId,
                name: used.name,
                amount: used.amount,
                unit: used.unit,
                category: "Restored",
              },
            });
          }
        }
      }

      await tx.cookingHistory.update({
        where: { id: cookingHistoryId },
        data: { status: "cancelled" },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Cooking cancelled and inventory restored",
    });
  } catch (error) {
    console.error("Cancel Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
