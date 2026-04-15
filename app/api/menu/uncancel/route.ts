import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { normalizeAmount } from "@/lib/inventory";

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

    const usedIngredients = history.usedIngredients as any[];
    const inventory = await prisma.ingredient.findMany({ where: { userId } });

    await prisma.$transaction(async (tx) => {
      for (const used of usedIngredients) {
        const stock = inventory.find(
          (i) =>
            i.name.toLowerCase().trim() === used.name.toLowerCase().trim() ||
            i.name.toLowerCase().startsWith(used.name.toLowerCase()) ||
            used.name.toLowerCase().startsWith(i.name.toLowerCase()),
        );

        if (stock && stock.amount !== null) {
          const stockNormalized = normalizeAmount(stock.amount, stock.unit ?? "");
          const usedNormalized  = normalizeAmount(used.amount,  used.unit  ?? "");

          if (stockNormalized >= usedNormalized) {
            const newTotalNormalized = stockNormalized - usedNormalized;
            let newAmount = stockNormalized > 0
              ? Math.max(0, Math.round(stock.amount * (newTotalNormalized / stockNormalized) * 10) / 10)
              : 0;

            if (newAmount <= 0.001) {
              await tx.ingredient.delete({ where: { id: stock.id } });
            } else {
              await tx.ingredient.update({
                where: { id: stock.id },
                data:  { amount: newAmount },
              });
            }
          } else {
            console.warn(
              `[Uncancel] Insufficient stock for ${stock.name}: have ${stock.amount}${stock.unit ?? ""}, trying to remove ${used.amount}${used.unit ?? ""}`,
            );
          }
        }
      }

      await tx.cookingHistory.update({
        where: { id: cookingHistoryId },
        data:  { status: "completed" },
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
