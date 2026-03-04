import { NextResponse, NextRequest } from "next/server";
import { lookupBarcode } from "@/lib/barcode";
import { auth } from "@/lib/auth";
import { checkUserLimit } from "@/lib/aiLimit";

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "ログインが必要です" },
        { status: 401 },
      );
    }

    const userId = session.user.id;

    // レート制限チェック
    const limitCheck = await checkUserLimit(userId, "BARCODE_SCAN");
    if (!limitCheck.ok) {
      return NextResponse.json(
        {
          error:
            "本日のバーコードスキャン上限に達しました（Free: 5回/日）。Proプランで無制限になります。",
          remaining: 0,
        },
        { status: 429 },
      );
    }

    // リクエストボディ取得
    const { barcode } = await req.json();
    if (!barcode || typeof barcode !== "string") {
      return NextResponse.json(
        { error: "バーコードが指定されていません" },
        { status: 400 },
      );
    }

    // バーコード検索実行
    const product = await lookupBarcode(barcode);

    if (!product.found) {
      return NextResponse.json(
        {
          error: "商品情報が見つかりませんでした",
          suggestion: "手動で商品名を入力してください",
        },
        { status: 404 },
      );
    }

    // 成功レスポンス
    return NextResponse.json({
      product: {
        name: product.name,
        category: product.category,
        brand: product.brand,
        image: product.image,
        expirationDays: product.expirationDays,
        source: product.source,
        ingredientType: product.ingredientType,
        requiresAdditionalIngredients: product.requiresAdditionalIngredients,
      },
      remaining: limitCheck.remaining,
    });
  } catch (error) {
    console.error("Barcode lookup error:", error);
    return NextResponse.json(
      { error: "バーコード検索中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
