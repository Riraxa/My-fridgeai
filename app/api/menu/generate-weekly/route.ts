import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWeeklyMenus } from "@/lib/weekly-planner";
import { auth } from "@/lib/auth";
import { addDays } from "date-fns";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // 1. Check User Plan (Pro Users Only)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (user?.plan !== "PRO" && process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { error: "週間献立はProプラン限定機能です" },
        { status: 403 },
      );
    }

    // 2. Rate Limiting (2 per week)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const count = await prisma.weeklyMenuGeneration.count({
      where: {
        userId,
        createdAt: { gte: oneWeekAgo },
      },
    });

    if (count >= 2 && process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { error: "週間献立の作成は週2回までです" },
        { status: 429 },
      );
    }

    // 3. Parse Request
    const body = await req.json();
    const startDate = body.startDate ? new Date(body.startDate) : new Date();

    // 4. Fetch Inventory & Preferences
    const [ingredients, preferences] = await Promise.all([
      prisma.ingredient.findMany({ where: { userId } }),
      prisma.$queryRaw`SELECT * FROM "UserPreferences" WHERE "userId" = ${userId} LIMIT 1`.then(
        (rows: any) => (rows && rows.length > 0 ? rows[0] : null),
      ),
    ]);

    if (ingredients.length === 0) {
      return NextResponse.json(
        { error: "冷蔵庫に食材がありません" },
        { status: 400 },
      );
    }

    // 5. Generate Weekly Menus
    // This is a heavy operation (7x AI calls)
    let result;
    try {
      result = await generateWeeklyMenus(ingredients, preferences, startDate);
    } catch (e: any) {
      console.error("Weekly Gen Error:", e);
      return NextResponse.json(
        { error: "献立作成に失敗しました: " + e.message },
        { status: 500 },
      );
    }

    // 6. Save to DB
    const endDate = addDays(startDate, 6);

    const generation = await prisma.weeklyMenuGeneration.create({
      data: {
        userId,
        startDate,
        endDate,
        dailyMenus: result.weeklyMenus as any,
        consolidatedShoppingList: result.shoppingList as any,
      },
    });

    return NextResponse.json({
      success: true,
      id: generation.id,
      weeklyMenus: result.weeklyMenus,
      shoppingList: result.shoppingList,
    });
  } catch (error) {
    console.error("Weekly Route Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
