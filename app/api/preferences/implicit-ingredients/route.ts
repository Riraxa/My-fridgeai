import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addIngredientSchema = z.object({
  name: z.string().min(1).max(20).trim(),
});

const bulkUpdateSchema = z.object({
  customIngredients: z.array(z.string().min(1).max(20)),
});

// カスタム暗黙食材一覧を取得
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const prefs = await prisma.userPreferences.findUnique({
      where: { userId },
      select: { customImplicitIngredients: true },
    });

    return NextResponse.json({
      customIngredients: prefs?.customImplicitIngredients ?? [],
    });
  } catch (error) {
    console.error("ImplicitIngredients GET Error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// カスタム暗黙食材を一括更新（単品追加もサポート）
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();

    // 一括更新パターン: { customIngredients: string[] }
    const bulkParsed = bulkUpdateSchema.safeParse(body);
    if (bulkParsed.success) {
      const { customIngredients } = bulkParsed.data;
      
      // Proプランのみ許可（Proプランでない場合は空配列のみ許可）
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
      });
      
      if (user?.plan !== "PRO" && customIngredients.length > 0) {
        return NextResponse.json(
          { error: "Proプランでのみ利用可能です" },
          { status: 403 }
        );
      }

      const updated = await prisma.userPreferences.upsert({
        where: { userId },
        update: {
          customImplicitIngredients: customIngredients,
        },
        create: {
          userId,
          customImplicitIngredients: customIngredients,
        },
      });

      return NextResponse.json({
        customIngredients: updated.customImplicitIngredients,
      });
    }

    // 単品追加パターン（従来互換）: { name: string }
    const singleParsed = addIngredientSchema.safeParse(body);
    if (!singleParsed.success) {
      return NextResponse.json(
        { error: "入力が不正です" },
        { status: 400 }
      );
    }

    const { name } = singleParsed.data;

    // Proプランのみ許可
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    if (user?.plan !== "PRO") {
      return NextResponse.json(
        { error: "Proプランでのみ利用可能です" },
        { status: 403 }
      );
    }

    const currentPrefs = await prisma.userPreferences.findUnique({
      where: { userId },
      select: { customImplicitIngredients: true },
    });

    const current = currentPrefs?.customImplicitIngredients ?? [];

    // 重複チェック（大文字小文字無視）
    const normalizedName = name.toLowerCase();
    if (current.some((ing) => ing.toLowerCase() === normalizedName)) {
      return NextResponse.json(
        { error: "この食材は既に登録されています" },
        { status: 409 }
      );
    }

    const updated = await prisma.userPreferences.upsert({
      where: { userId },
      update: {
        customImplicitIngredients: { push: name },
      },
      create: {
        userId,
        customImplicitIngredients: [name],
      },
    });

    return NextResponse.json({
      customIngredients: updated.customImplicitIngredients,
    });
  } catch (error) {
    console.error("ImplicitIngredients POST Error:", error);
    return NextResponse.json({ error: "追加に失敗しました" }, { status: 500 });
  }
}
