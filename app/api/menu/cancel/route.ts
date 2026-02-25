//app/api/menu/cancel/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { increaseAmountLevel, normalizeAmount } from "@/lib/inventory";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { cookingHistoryId } = await req.json();

    const history = await prisma.cookingHistory.findUnique({
      where: { id: cookingHistoryId },
    });

    if (history?.userId !== userId) {
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
        // Skip restoration for ingredients that didn't exist in original inventory
        // For backward compatibility, treat undefined as true (old data assumed to exist)
        const existedInOriginalInventory =
          used.existedInOriginalInventory !== false;

        if (!existedInOriginalInventory) {
          console.log(
            `[Cancel] Skipping restoration for non-existing ingredient: ${used.name}`,
          );
          continue;
        }

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
            // Add back amount with proper unit conversion
            const stockNormalized = normalizeAmount(
              stock.amount,
              stock.unit || "",
            );
            const usedNormalized = normalizeAmount(
              used.amount,
              used.unit || "",
            );
            const newTotalNormalized = stockNormalized + usedNormalized;

            // Convert back to original unit
            let newAmount = 0;
            if (stockNormalized > 0) {
              newAmount = stock.amount * (newTotalNormalized / stockNormalized);
            } else {
              newAmount = used.amount; // Edge case: stock was 0, use used amount
            }

            // 小数点第一位まで表示し、それ以降は四捨五入
            newAmount = Math.round(newAmount * 10) / 10;

            // Ensure we don't go negative due to floating point precision
            newAmount = Math.max(0, newAmount);

            await tx.ingredient.update({
              where: { id: stock.id },
              data: { amount: newAmount },
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
          // Ingredient was deleted (consumed entirely) - restore it only if it existed originally
          if (existedInOriginalInventory && used.amount) {
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
