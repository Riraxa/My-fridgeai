import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safetySchema } from "@/lib/validators/preferences";

/**
 * GET: ユーザーのアレルギー・食事制限一覧を返す
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const [allergies, restrictions] = await Promise.all([
      prisma.userAllergy.findMany({ where: { userId } }),
      prisma.userRestriction.findMany({ where: { userId } }),
    ]);

    return NextResponse.json({ allergies, restrictions });
  } catch (error) {
    console.error("Safety GET Error:", error);
    return NextResponse.json(
      { error: "情報の取得に失敗しました" },
      { status: 500 },
    );
  }
}

/**
 * POST: アレルギー/制限の追加
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const body = await req.json();

    const parsed = safetySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "バリデーションエラー", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.type === "allergy") {
      // 重複チェック
      const existing = await prisma.userAllergy.findFirst({
        where: { userId, allergen: data.allergen },
      });
      if (existing) {
        return NextResponse.json(
          { error: "既に登録されています" },
          { status: 409 },
        );
      }

      const allergy = await prisma.userAllergy.create({
        data: {
          userId,
          allergen: data.allergen,
          label: data.label ?? data.allergen,
        },
      });
      return NextResponse.json(allergy, { status: 201 });
    } else {
      const restriction = await prisma.userRestriction.create({
        data: {
          userId,
          type: data.restrictionType,
          note: data.note,
        },
      });
      return NextResponse.json(restriction, { status: 201 });
    }
  } catch (error) {
    console.error("Safety POST Error:", error);
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}
