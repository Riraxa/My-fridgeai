import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tasteUpdateSchema } from "@/lib/validators/preferences";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const prefs = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!prefs) {
      return NextResponse.json({
        tasteScores: {},
        lifestyle: {
          weekdayMode: {
            timePriority: "normal",
            dishwashingAvoid: false,
            singlePan: false,
          },
          weekendMode: {
            timePriority: "normal",
            dishwashingAvoid: false,
            singlePan: false,
          },
        },
      });
    }

    return NextResponse.json(prefs.tasteJson || {});
  } catch (error) {
    console.error("Taste GET Error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const body = await req.json();

    const parsed = tasteUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "バリデーションエラー", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const currentPrefs = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    const currentTaste = (currentPrefs?.tasteJson as any) || {};
    const updatedTaste = {
      ...currentTaste,
      ...parsed.data,
      lifestyle: {
        ...(currentTaste.lifestyle || {}),
        ...(parsed.data.lifestyle || {}),
      },
    };

    const updated = await prisma.userPreferences.upsert({
      where: { userId },
      update: { tasteJson: updatedTaste },
      create: { userId, tasteJson: updatedTaste },
    });

    return NextResponse.json(updated.tasteJson);
  } catch (error) {
    console.error("Taste PUT Error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
