import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ name: string }>;
}

// カスタム暗黙食材を削除
export async function DELETE(req: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

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

    const { name } = await params;
    const decodedName = decodeURIComponent(name);

    const currentPrefs = await prisma.userPreferences.findUnique({
      where: { userId },
      select: { customImplicitIngredients: true },
    });

    const current = currentPrefs?.customImplicitIngredients ?? [];

    // 該当する食材を除去（大文字小文字無視）
    const normalizedTarget = decodedName.toLowerCase();
    const updated = current.filter(
      (ing) => ing.toLowerCase() !== normalizedTarget
    );

    // 変化がなければ404
    if (updated.length === current.length) {
      return NextResponse.json(
        { error: "指定された食材が見つかりません" },
        { status: 404 }
      );
    }

    await prisma.userPreferences.update({
      where: { userId },
      data: {
        customImplicitIngredients: updated,
      },
    });

    return NextResponse.json({
      customIngredients: updated,
    });
  } catch (error) {
    console.error("ImplicitIngredients DELETE Error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
