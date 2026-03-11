// GENERATED_BY_AI: 2026-03-11 Antigravity
// app/api/receipt/confirm/route.ts
// POST: Confirm parsed receipt items and add them to Ingredient inventory.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface ConfirmItem {
  receiptItemId: string;
  mappedIngredientId: string | null;
  finalName: string;
  finalQuantityValue: number | null;
  finalQuantityUnit: string | null;
  finalInferredLevel: string | null;
  finalCategory: string | null;
  action: "add" | "skip"; // user can skip individual items
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Parse request body
    const body = await req.json();
    const { receiptId, items } = body as {
      receiptId: string;
      items: ConfirmItem[];
    };

    if (!receiptId || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "receiptId と items が必要です" },
        { status: 400 },
      );
    }

    // 3. Verify receipt ownership
    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: { items: true },
    });

    if (!receipt) {
      return NextResponse.json(
        { error: "レシートが見つかりません" },
        { status: 404 },
      );
    }

    if (receipt.uploadedBy !== userId) {
      return NextResponse.json(
        { error: "このレシートへのアクセス権がありません" },
        { status: 403 },
      );
    }

    if (receipt.status === "confirmed") {
      return NextResponse.json(
        { error: "このレシートは既に登録済みです" },
        { status: 409 },
      );
    }

    // 4. Process items in a transaction
    const result = await prisma.$transaction(async (tx) => {
      let addedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (const item of items) {
        if (item.action === "skip") {
          skippedCount++;
          continue;
        }

        const name = (item.finalName ?? "").trim();
        if (!name) {
          skippedCount++;
          continue;
        }

        if (item.mappedIngredientId) {
          // Update existing ingredient (optimistic lock)
          const existing = await tx.ingredient.findUnique({
            where: { id: item.mappedIngredientId },
          });

          if (existing && existing.userId === userId) {
            // Add quantity to existing
            const newAmount = (existing.amount ?? 0) + (item.finalQuantityValue ?? 1);
            await tx.ingredient.update({
              where: { id: item.mappedIngredientId },
              data: {
                amount: newAmount,
                unit: item.finalQuantityUnit ?? existing.unit,
                amountLevel: item.finalInferredLevel ?? existing.amountLevel,
                version: { increment: 1 },
              },
            });
            updatedCount++;
          } else {
            // Ingredient doesn't exist or belongs to another user, create new
            await tx.ingredient.create({
              data: {
                userId,
                name,
                amount: item.finalQuantityValue ?? 1,
                unit: item.finalQuantityUnit ?? "個",
                amountLevel: item.finalInferredLevel ?? "normal",
                category: item.finalCategory ?? "その他",
                ingredientType: "raw",
              },
            });
            addedCount++;
          }
        } else {
          // New ingredient
          await tx.ingredient.create({
            data: {
              userId,
              name,
              amount: item.finalQuantityValue ?? 1,
              unit: item.finalQuantityUnit ?? "個",
              amountLevel: item.finalInferredLevel ?? "normal",
              category: item.finalCategory ?? "その他",
              ingredientType: "raw",
            },
          });
          addedCount++;
        }

        // Mark receipt item as user-modified if applicable
        if (item.receiptItemId) {
          await tx.receiptItem.update({
            where: { id: item.receiptItemId },
            data: { userModified: true },
          }).catch(() => {/* ignore if not found */});
        }
      }

      // Mark receipt as confirmed
      await tx.receipt.update({
        where: { id: receiptId },
        data: {
          status: "confirmed",
          confirmedAt: new Date(),
          rawText: null, // Privacy: clear raw text after confirmation
        },
      });

      return { addedCount, updatedCount, skippedCount };
    });

    return NextResponse.json({
      success: true,
      receiptId,
      applied: result.addedCount + result.updatedCount,
      added: result.addedCount,
      updated: result.updatedCount,
      skipped: result.skippedCount,
    });
  } catch (error) {
    console.error("Receipt confirm error:", error);
    return NextResponse.json(
      { error: "在庫登録中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
