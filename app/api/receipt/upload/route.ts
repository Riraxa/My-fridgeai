// GENERATED_BY_AI: 2026-03-11 Antigravity
// app/api/receipt/upload/route.ts
// POST: Upload receipt image, run OCR + parsing pipeline, return parsed results.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractTextFromImage, filterReceiptLines } from "@/lib/receipt/ocr";
import { parseReceiptLines } from "@/lib/receipt/parser";

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const householdId = formData.get("householdId") as string | null;
    const idempotencyKey = formData.get("idempotencyKey") as string | null;

    if (!file) {
      return NextResponse.json({ error: "画像ファイルが必要です" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "対応形式: JPEG, PNG, WebP" },
        { status: 400 },
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "画像サイズは4MB以下にしてください" },
        { status: 413 },
      );
    }

    // 3. Resolve householdId
    let resolvedHouseholdId = householdId;
    if (!resolvedHouseholdId) {
      // Find user's household
      const membership = await prisma.householdMember.findFirst({
        where: { userId },
        select: { householdId: true },
      });
      const ownedHousehold = await prisma.household.findFirst({
        where: { ownerId: userId },
        select: { id: true },
      });
      resolvedHouseholdId = membership?.householdId ?? ownedHousehold?.id ?? null;
    }

    if (!resolvedHouseholdId) {
      return NextResponse.json(
        { error: "Householdが見つかりません" },
        { status: 400 },
      );
    }

    // 4. Household authorization check
    const isMember = await prisma.householdMember.findFirst({
      where: { householdId: resolvedHouseholdId, userId },
    });
    const isOwner = await prisma.household.findFirst({
      where: { id: resolvedHouseholdId, ownerId: userId },
    });
    if (!isMember && !isOwner) {
      return NextResponse.json(
        { error: "このHouseholdへのアクセス権がありません" },
        { status: 403 },
      );
    }

    // 5. Idempotency check
    if (idempotencyKey) {
      const existing = await prisma.receipt.findFirst({
        where: { idempotencyKey, uploadedBy: userId },
        include: { items: true },
      });
      if (existing) {
        return NextResponse.json({
          receiptId: existing.id,
          status: existing.status,
          items: existing.items,
          message: "既に処理済みのレシートです",
        });
      }
    }

    // 6. Convert image to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // 7. Create receipt record
    const receipt = await prisma.receipt.create({
      data: {
        householdId: resolvedHouseholdId,
        uploadedBy: userId,
        status: "processing",
        idempotencyKey: idempotencyKey ?? undefined,
      },
    });

    // 8. OCR: Extract text from image
    const ocrResult = await extractTextFromImage(base64, file.type);

    if (!ocrResult.success || ocrResult.rawLines.length === 0) {
      await prisma.receipt.update({
        where: { id: receipt.id },
        data: { status: "cancelled" },
      });
      return NextResponse.json(
        {
          receiptId: receipt.id,
          error: ocrResult.error ?? "レシートのテキストを読み取れませんでした",
          status: "failed",
        },
        { status: 422 },
      );
    }

    // 9. Filter receipt lines
    const { productLines } = filterReceiptLines(ocrResult.rawLines);

    if (productLines.length === 0) {
      await prisma.receipt.update({
        where: { id: receipt.id },
        data: {
          status: "parsed",
          rawText: ocrResult.rawText,
          parsedAt: new Date(),
        },
      });
      return NextResponse.json({
        receiptId: receipt.id,
        status: "parsed",
        items: [],
        message: "商品行が見つかりませんでした",
      });
    }

    // 10. Parse product lines
    const allParsedItems = await parseReceiptLines(productLines, userId);

    // 11. Filter out clearly non-food items (confidenceScore 0)
    const parsedItems = allParsedItems.filter((item) => item.confidenceScore > 0);

    if (parsedItems.length === 0) {
      await prisma.receipt.update({
        where: { id: receipt.id },
        data: {
          status: "parsed",
          rawText: ocrResult.rawText,
          parsedAt: new Date(),
        },
      });
      return NextResponse.json({
        receiptId: receipt.id,
        status: "parsed",
        items: [],
        message: "食材を検出できませんでした",
      });
    }

    // 12. Save parsed items to DB
    const receiptItems = await prisma.$transaction(async (tx) => {
      const items = [];
      for (const item of parsedItems) {
        const created = await tx.receiptItem.create({
          data: {
            receiptId: receipt.id,
            lineText: item.lineText,
            productName: item.productName,
            normalizedName: item.normalizedName,
            mappedIngredientId: item.mappedIngredientId,
            quantityValue: item.quantityValue,
            quantityUnit: item.quantityUnit,
            inferredLevel: item.inferredLevel,
            processedCategory: item.processedCategory,
            confidenceScore: item.confidenceScore,
          },
        });
        items.push({
          ...created,
          mappedIngredientName: item.mappedIngredientName,
        });
      }

      await tx.receipt.update({
        where: { id: receipt.id },
        data: {
          status: "parsed",
          rawText: ocrResult.rawText,
          parsedAt: new Date(),
        },
      });

      return items;
    });

    // 12. Return parsed results
    return NextResponse.json({
      receiptId: receipt.id,
      status: "parsed",
      items: receiptItems.map((item) => ({
        id: item.id,
        productName: item.productName,
        normalizedName: item.normalizedName,
        mappedIngredientId: item.mappedIngredientId,
        mappedIngredientName: (item as any).mappedIngredientName ?? null,
        processedCategory: item.processedCategory,
        quantityValue: item.quantityValue,
        quantityUnit: item.quantityUnit,
        inferredLevel: item.inferredLevel,
        confidenceScore: item.confidenceScore,
      })),
    });
  } catch (error) {
    console.error("Receipt upload error:", error);
    return NextResponse.json(
      { error: "レシートの処理中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
