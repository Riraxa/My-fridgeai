import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const freeTextSchema = z.object({
  freeText: z.string().max(300),
});

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Pro ユーザーチェック
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (user?.plan !== "PRO") {
      return NextResponse.json(
        {
          error: "この機能はPro限定です。",
          code: "PRO_ONLY",
        },
        { status: 403 },
      );
    }

    const body = await req.json();
    const parsed = freeTextSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "300文字以内で入力してください" },
        { status: 400 },
      );
    }

    // 簡易フィルタリング（実際はもっと高度にする可能性があるが、今回は指示通り）
    const forbiddenPatterns = [
      /危険/i,
      /殺す/i,
      /死ね/i,
      /アレルギー.*無視/i,
      /allergy.*ignore/i,
      /ignore.*allergy/i,
    ];

    const isForbidden = forbiddenPatterns.some((p) =>
      p.test(parsed.data.freeText),
    );
    if (isForbidden) {
      return NextResponse.json(
        {
          error:
            "不適切な表現が含まれています。安全に関する制約を無視する指示はできません。",
          code: "FORBIDDEN_CONTENT",
        },
        { status: 422 },
      );
    }

    const currentPrefs = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    const currentTaste = (currentPrefs?.tasteJson as any) || {};
    const updatedTaste = {
      ...currentTaste,
      freeText: parsed.data.freeText,
      freeTextMeta: {
        length: parsed.data.freeText.length,
        filtered: false,
      },
    };

    await prisma.userPreferences.upsert({
      where: { userId },
      update: { tasteJson: updatedTaste },
      create: { userId, tasteJson: updatedTaste },
    });

    return NextResponse.json({ freeText: parsed.data.freeText });
  } catch (error) {
    console.error("Free-text PUT Error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
