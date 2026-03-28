import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET: Fetch user preferences
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    let preferences = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Return default if not exists
      return NextResponse.json({
        preferences: {
          cookingSkill: "intermediate",
          comfortableMethods: [],
          avoidMethods: [],
          kitchenEquipment: ["ガスコンロ", "電子レンジ", "フライパン", "鍋", "IH"],
        },
      });
    }

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("Preferences GET Error:", error);
    return NextResponse.json(
      { error: "設定の取得に失敗しました" },
      { status: 500 },
    );
  }
}

/**
 * POST: Update or create user preferences
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const body = await req.json();

    const { cookingSkill, comfortableMethods, avoidMethods, kitchenEquipment, aiMessageEnabled } =
      body;

    // Build update/create data, only including aiMessageEnabled if explicitly provided
    const data: any = {};
    if (cookingSkill !== undefined) data.cookingSkill = cookingSkill;
    if (comfortableMethods !== undefined) {
      data.comfortableMethods = Array.isArray(comfortableMethods) ? comfortableMethods : [];
    }
    if (avoidMethods !== undefined) {
      data.avoidMethods = Array.isArray(avoidMethods) ? avoidMethods : [];
    }
    if (kitchenEquipment !== undefined) {
      data.kitchenEquipment = Array.isArray(kitchenEquipment) ? kitchenEquipment : [];
    }
    if (typeof aiMessageEnabled === "boolean") data.aiMessageEnabled = aiMessageEnabled;

    const updated = await prisma.userPreferences.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });

    return NextResponse.json({ preferences: updated });
  } catch (error) {
    console.error("Preferences POST Error:", error);
    return NextResponse.json(
      { error: "設定の保存に失敗しました" },
      { status: 500 },
    );
  }
}
