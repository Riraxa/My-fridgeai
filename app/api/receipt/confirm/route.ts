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
  finalExpirationDays: number | null;
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

        // Calculate expiration date if days provided
        let expirationDate: Date | null = null;
        if (item.finalExpirationDays !== null && item.finalExpirationDays !== undefined) {
          expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + item.finalExpirationDays);
        }

        // Always create as new ingredient [Requirement: Add, not merge/replace]
        await tx.ingredient.create({
          data: {
            userId,
            name,
            amount: item.finalQuantityValue ?? 1,
            unit: item.finalQuantityUnit ?? "個",
            category: item.finalCategory ?? "その他",
            expirationDate,
            expirationEstimated: expirationDate !== null,
            ingredientType: "raw",
          },
        });
        addedCount++;
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
