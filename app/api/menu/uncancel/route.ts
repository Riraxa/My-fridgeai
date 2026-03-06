import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { decreaseAmountLevel, normalizeAmount } from "@/lib/inventory";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
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

    if (history.status !== "cancelled") {
      return NextResponse.json({ error: "Not cancelled" }, { status: 400 });
    }

    // Remove Inventory again (reverse the restoration)
    const usedIngredients = history.usedIngredients as any[]; // [{name, amount, unit}]
    const inventory = await prisma.ingredient.findMany({ where: { userId } });

    await prisma.$transaction(async (tx) => {
      for (const used of usedIngredients) {
        // Find matching ingredient to remove from.
        let stock = inventory.find(
          (i) =>
            i.name.toLowerCase().trim() === used.name.toLowerCase().trim() ||
            i.name.toLowerCase().startsWith(used.name.toLowerCase()) ||
            used.name.toLowerCase().startsWith(i.name.toLowerCase()),
        );

        if (stock) {
          if (stock.amount !== null) {
            // Remove amount with proper unit conversion
            const stockNormalized = normalizeAmount(
              stock.amount,
              stock.unit || "",
            );
            const usedNormalized = normalizeAmount(
              used.amount,
              used.unit || "",
            );

            if (stockNormalized >= usedNormalized) {
              const newTotalNormalized = stockNormalized - usedNormalized;

              // Convert back to original unit
              let newAmount = 0;
              if (stockNormalized > 0) {
                newAmount =
                  stock.amount * (newTotalNormalized / stockNormalized);
              } else {
                newAmount = 0; // Edge case: stock was 0
              }

              // 小数点第一位まで表示し、それ以降は四捨五入
              newAmount = Math.round(newAmount * 10) / 10;

              // Ensure we don't go negative due to floating point precision
              newAmount = Math.max(0, newAmount);

              if (newAmount <= 0.001) {
                // Use small threshold for floating point comparison
                // Delete if amount becomes zero or negative
                await tx.ingredient.delete({ where: { id: stock.id } });
              } else {
                await tx.ingredient.update({
                  where: { id: stock.id },
                  data: { amount: newAmount },
                });
              }
            } else {
              // Insufficient stock - this shouldn't happen in normal uncancel flow
              console.warn(
                `[Uncancel] Insufficient stock for ${stock.name}: have ${stock.amount}${stock.unit || ""}, trying to remove ${used.amount}${used.unit || ""}`,
              );
            }
          } else if (stock.amountLevel) {
            // Decrease level
            const newLevel = decreaseAmountLevel(stock.amountLevel);
            if (newLevel === "なし") {
              await tx.ingredient.delete({ where: { id: stock.id } });
            } else {
              await tx.ingredient.update({
                where: { id: stock.id },
                data: { amountLevel: newLevel },
              });
            }
          }
        }
      }

      await tx.cookingHistory.update({
        where: { id: cookingHistoryId },
        data: { status: "completed" },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Uncancel successful and inventory consumed again",
    });
  } catch (error) {
    console.error("Uncancel Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
